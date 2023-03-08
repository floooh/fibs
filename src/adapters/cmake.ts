import { AdapterDesc, AdapterOptions, BuildType, Config, cmake, host, log, Project, Target, util } from '../../mod.ts';

export const cmakeAdapter: AdapterDesc = {
    configure: configure,
    build: build,
};

export async function configure(project: Project, config: Config, options: AdapterOptions) {
    const cmakeListsPath = `${project.dir}/CMakeLists.txt`;
    const cmakePresetsPath = `${project.dir}/CMakePresets.json`;
    log.info(`writing ${cmakeListsPath}`);
    try {
        Deno.writeTextFileSync(
            cmakeListsPath,
            genCMakeListsTxt(project, config),
            { create: true },
        );
    } catch (err) {
        log.error(`Failed writing ${cmakeListsPath}: ${err.message}`);
    }
    log.info(`writing ${cmakePresetsPath}`);
    try {
        Deno.writeTextFileSync(
            cmakePresetsPath,
            genCMakePresetsJson(project, config),
            { create: true },
        );
    } catch (err) {
        log.error(`Failed writing CMakePresets.json: ${err.message}`);
    }
    await cmake.configure(project, config);
}

export async function build(project: Project, config: Config, options: AdapterOptions) {
    if (!util.fileExists(`${util.buildDir(project, config)}/CMakeCache.txt`)) {
        await configure(project, config, options);
    }
    await cmake.build(project, config, {
        target: options.buildTarget,
        cleanFirst: options.forceRebuild,
    });
}

function filePath(importDir: string, dir: string | undefined, rest: string): string {
    let str = importDir + '/';
    if (dir !== undefined) {
        str += dir + '/';
    }
    str += rest;
    return str;
}

function genCMakeListsTxt(project: Project, config: Config): string {
    let str = '';
    str += genProlog(project, config);
    const targets = Object.values(project.targets);
    targets.forEach((target) => {
        str += genTarget(project, config, target);
    });
    targets.forEach((target) => {
        str += genTargetDependencies(project, config, target);
        str += genTargetIncludeDirectories(project, config, target);
    });
    return str;
}

function genProlog(project: Project, config: Config): string {
    let str = '';
    str += 'cmake_minimum_required(VERSION 3.2)\n';
    str += `project(${project.name})\n`;
    str += 'set(CMAKE_C_STANDARD 99)\n'; // FIXME: make configurable
    str += 'set(CMAKE_CXX_STANDARD 14)\n'; // FIXME: make configurable
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    if (config.platform === 'emscripten') {
        str += 'set(CMAKE_EXECUTABLE_SUFFIX ".html")\n';
    } else if (config.platform === 'wasi') {
        str += 'set(CMAKE_EXECUTABLE_SUFFIX ".wasm")\n';
    }
    return str;
}

function genTarget(project: Project, config: Config, target: Target): string {
    let str = '';
    let subtype = '';
    switch (target.type) {
        case 'plain-exe':
        case 'windowed-exe':
            if (target.type === 'windowed-exe') {
                if (config.platform === 'windows') {
                    subtype = 'WIN32';
                } else if ((config.platform === 'macos') || (config.platform === 'ios')) {
                    subtype = 'MACOSX_BUNDLE';
                }
            }
            str += `add_executable(${target.name}${subtype}\n`;
            break;
        case 'lib':
            str += `add_library(${target.name} STATIC\n`;
            break;
        case 'dll':
            str += `add_library(${target.name} SHARED\n`;
            break;
    }
    target.sources.forEach((source) => {
        str += `    ${filePath(target.importDir, target.dir, source)}\n`;
    });
    str += ')\n';
    return str;
}

function genTargetDependencies(project: Project, config: Config, target: Target): string {
    let str = '';
    if (target.deps.libs.length > 0) {
        if (target.type === 'lib') {
            str += `target_link_libraries(${target.name} INTERFACE ${target.deps.libs.join(' ')})\n`;
        } else {
            str += `target_link_libraries(${target.name} ${target.deps.libs.join(' ')})\n`;
        }
    }
    // FIXME: osx frameworks
    return str;
}

function genTargetIncludeDirectories(project: Project, config: Config, target: Target): string {
    let str = '';
    const system = (target.includeDirectories.system === true) ? ' SYSTEM' : '';
    if (target.includeDirectories.interface) {
        const items = target.includeDirectories.interface.map((rest) => filePath(target.importDir, target.dir, rest));
        if (items.length > 0) {
            str += `target_include_directories(${target.name}${system} INTERFACE ${items.join(' ')})\n`;
        }
    }
    if (target.includeDirectories.private) {
        const items = target.includeDirectories.private.map((rest) => filePath(target.importDir, target.dir, rest));
        if (items.length > 0) {
            str += `target_include_directories(${target.name}${system} PRIVATE ${items.join(' ')})\n`;
        }
    }
    if (target.includeDirectories.public) {
        const items = target.includeDirectories.public.map((rest) => filePath(target.importDir, target.dir, rest));
        if (items.length > 0) {
            str += `target_include_directories(${target.name}${system} PUBLIC ${items.join(' ')})\n`;
        }
    }
    return str;
}

function genCMakePresetsJson(project: Project, config: Config): string {
    let preset: any = {
        version: 6,
        cmakeMinimumRequired: {
            major: 3,
            minor: 21,
            patch: 0,
        },
        configurePresets: genConfigurePresets(project, config),
        buildPresets: genBuildPresets(project, config),
    };
    return JSON.stringify(preset, null, 2);
}

function genConfigurePresets(project: Project, config: Config): any[] {
    const res = [];
    if (util.validConfigForPlatform(config, host.platform())) {
        const aliasMap = util.aliasMap(project, config, config.importDir);
        res.push({
            name: config.name,
            displayName: config.name,
            binaryDir: util.buildDir(project, config),
            generator: config.generator,
            toolchainFile: (config.toolchainFile !== undefined) ? util.resolveAlias(config.toolchainFile, aliasMap) : undefined,
            cacheVariables: genCacheVariables(project, config),
            environment: config.environment,
        });
    }
    return res;
}

function asCMakeBuildType(buildType: BuildType): string {
    switch (buildType) {
        case 'debug':
            return 'Debug';
        case 'release':
            return 'Release';
    }
}

function isMultiConfigGenerator(config: Config): boolean {
    if (config.generator === undefined) {
        return config.platform === 'windows';
    } else {
        if (config.generator.startsWith('Visual Studio')) {
            return true;
        } else if (config.generator === 'Ninja Multi-Config') {
            return true;
        } else if (config.generator === 'Xcode') {
            return true;
        } else {
            return false;
        }
    }
}

function genCacheVariables(project: Project, config: Config): Record<string, any> {
    let res: Record<string, any> = {};
    if (!isMultiConfigGenerator(config)) {
        res.CMAKE_BUILD_TYPE = asCMakeBuildType(config.buildType);
    }
    if (config.platform !== 'android') {
        res.CMAKE_RUNTIME_OUTPUT_DIRECTORY = util.distDir(project, config);
    }
    for (const key in config.variables) {
        const val = config.variables[key];
        if (typeof val === 'boolean') {
            res[key] = {
                type: 'BOOL',
                value: val ? 'ON' : 'OFF',
            };
        } else {
            res[key] = val;
        }
    }
    return res;
}

function genBuildPresets(project: Project, config: Config): any[] {
    if (isMultiConfigGenerator(config)) {
        return [
            { name: 'default', configurePreset: config.name, configuration: asCMakeBuildType(config.buildType) },
            { name: 'debug', configurePreset: config.name, configuration: asCMakeBuildType('debug') },
            { name: 'release', configurePreset: config.name, configuration: asCMakeBuildType('release') },
        ];
    } else {
        return [ { name: 'default', configurePreset: config.name } ];
    }
}
