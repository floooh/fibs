import { AdapterDesc, AdapterOptions, BuildType, Config, host, log, Project, Target, util } from '../../mod.ts';
import * as cmakeTool from '../tools/cmake.ts';

export const cmake: AdapterDesc = {
    generate: generate,
    build: build,
};

export async function generate(project: Project, config: Config, options: AdapterOptions) {
    const cmakeListsPath = `${project.dir}/CMakeLists.txt`;
    const cmakePresetsPath = `${project.dir}/CMakePresets.json`;
    let genDirty = (options.forceGenerate === true) ? true : false;
    if (!genDirty) {
        // FIXME: inputs should actually be all dependency fibs files
        const fibsPath = `${project.dir}/fibs.ts`;
        genDirty = util.isDirty([fibsPath], [cmakeListsPath, cmakePresetsPath]);
    }
    if (genDirty) {
        log.info(`generating ${cmakeListsPath}`);
        try {
            Deno.writeTextFileSync(
                cmakeListsPath,
                genCMakeListsTxt(project, config),
                { create: true },
            );
        } catch (err) {
            log.error(`Failed writing ${cmakeListsPath}: ${err.message}`);
        }
        log.info(`generating ${cmakePresetsPath}`);
        try {
            Deno.writeTextFileSync(
                cmakePresetsPath,
                genCMakePresetsJson(project, config),
                { create: true },
            );
        } catch (err) {
            log.error(`Failed writing CMakePresets.json: ${err.message}`);
        }
    }
    await cmakeTool.configure(project, config);
}

export async function build(project: Project, config: Config, options: AdapterOptions) {
    await generate(project, config, options);
    await cmakeTool.build(project, config, {
        target: options.buildTarget,
        cleanFirst: options.forceRebuild,
        buildType: config.buildType,
    });
}

function filePath(project: Project, dir: string | undefined, rest: string): string {
    let str = project.dir + '/';
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
    str += 'set(CMAKE_C_STANDARD 99)\n'; // FIXME: make configurable
    str += 'set(CMAKE_CXX_STANDARD 14)\n'; // FIXME: make configurable
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    str += 'macro(fibs_exe_target_postfix target)\n';
    str += '  if (FIBS_PLATFORM STREQUAL "emscripten")\n';
    str += '    set_target_properties(${target} PROPERTIES RELEASE_POSTFIX ".html")\n';
    str += '    set_target_properties(${target} PROPERTIES DEBUG_POSTFIX ".html")\n';
    str += '  elseif (FIBS_PLATFORM STREQUAL "wasi")\n';
    str += '    set_target_properties(${target} PROPERTIES RELEASE_POSTFIX ".wasm")\n';
    str += '    set_target_properties(${target} PROPERTIES DEBUG_POSTFIX ".wasm")\n';
    str += '  endif()\n';
    str += 'endmacro(fibs_target_postfix)\n';
    str += `project(${project.name})\n`;
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
        str += `    ${filePath(project, target.dir, source)}\n`;
    });
    str += ')\n';
    if ((target.type === 'plain-exe') || (target.type === 'windowed-exe')) {
        str += `fibs_exe_target_postfix(${target.name})\n`;
    }
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
        const items = target.includeDirectories.interface.map((rest) => filePath(project, target.dir, rest));
        if (items.length > 0) {
            str += `target_include_directories(${target.name}${system} INTERFACE ${items.join(' ')})\n`;
        }
    }
    if (target.includeDirectories.private) {
        const items = target.includeDirectories.private.map((rest) => filePath(project, target.dir, rest));
        if (items.length > 0) {
            str += `target_include_directories(${target.name}${system} PRIVATE ${items.join(' ')})\n`;
        }
    }
    if (target.includeDirectories.public) {
        const items = target.includeDirectories.public.map((rest) => filePath(project, target.dir, rest));
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
        configurePresets: genConfigurePresets(project),
        buildPresets: genBuildPresets(project, config),
    };
    return JSON.stringify(preset, null, 2);
}

function genConfigurePresets(project: Project): any[] {
    let res = [];
    for (const k in project.configs) {
        const config = project.configs[k];
        if (util.validConfigForPlatform(config, host.platform())) {
            res.push({
                name: config.name,
                displayName: config.name,
                binaryDir: util.buildDir(project, config),
                generator: config.generator,
                toolchainFile: config.toolchainFile,
                cacheVariables: genCacheVariables(project, config),
                environment: config.environment,
            });
        }
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

function genCacheVariables(project: Project, config: Config): Record<string, any> {
    let res: Record<string, any> = {
        CMAKE_BUILD_TYPE: asCMakeBuildType(config.buildType),
        FIBS_PLATFORM: config.platform,
    };
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

function genBuildPresets(project: Project, defaultConfig: Config): any[] {
    let res = [];
    for (const k in project.configs) {
        const config = project.configs[k];
        if (util.validConfigForPlatform(config, host.platform())) {
            res.push({
                name: config.name,
                configurePreset: config.name,
            });
        }
    }
    return res;
}
