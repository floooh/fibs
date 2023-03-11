import {
    AdapterDesc,
    AdapterOptions,
    BuildType,
    Config,
    Compiler,
    cmake,
    host,
    log,
    Project,
    Target,
    TargetBuildContext,
    util,
    target,
conf,
} from '../../mod.ts';

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
    targets.forEach((tgt) => {
        str += genTarget(project, config, tgt);
    });
    targets.forEach((tgt) => {
        str += genTargetDependencies(project, config, tgt);
        str += genTargetIncludeDirectories(project, config, tgt);
        str += genTargetCompileDefinitions(project, config, tgt);
        str += genTargetCompileOptions(project, config, tgt);
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

function genTarget(project: Project, config: Config, tgt: Target): string {
    let str = '';
    let subtype = '';
    switch (tgt.type) {
        case 'plain-exe':
        case 'windowed-exe':
            if (tgt.type === 'windowed-exe') {
                if (config.platform === 'windows') {
                    subtype = 'WIN32';
                } else if ((config.platform === 'macos') || (config.platform === 'ios')) {
                    subtype = 'MACOSX_BUNDLE';
                }
            }
            str += `add_executable(${tgt.name}${subtype}\n`;
            break;
        case 'lib':
            str += `add_library(${tgt.name} STATIC\n`;
            break;
        case 'dll':
            str += `add_library(${tgt.name} SHARED\n`;
            break;
        case 'void':
            str += `add_library(${tgt.name} INTERFACE)\n`;
            break;
    }
    if (tgt.type !== 'void') {
        tgt.sources.forEach((source) => {
            str += `    ${filePath(tgt.importDir, tgt.dir, source)}\n`;
        });
        str += ')\n';
    }
    return str;
}

function compilerId(compiler: Compiler): string {
    switch (compiler) {
        case 'msvc': return 'MSVC';
        case 'gcc': return 'GNU';
        case 'clang': return 'Clang';
        case 'appleclang': return 'AppleClang';
    }
}

function genTargetDependencies(project: Project, config: Config, tgt: Target): string {
    let str = '';
    conf.compilers(config).forEach((compiler) => {
        let libs: string[];
        if (typeof tgt.libs === 'function') {
            const ctx: TargetBuildContext = {
                config,
                compiler,
                target: tgt,
            };
            libs = tgt.libs(ctx);
        } else {
            libs = tgt.libs;
        }
        libs = libs.map((lib) => `"${lib}"`);
        if (libs.length > 0) {
            str += `if (\${CMAKE_C_COMPILER_ID} STREQUAL ${compilerId(compiler)})\n`;
            if ((tgt.type === 'lib') || (tgt.type === 'void')) {
                str += `  target_link_libraries(${tgt.name} INTERFACE ${libs.join(' ')})\n`;
            } else {
                str += `  target_link_libraries(${tgt.name} ${libs.join(' ')})\n`;
            }
            str += 'endif()\n'
        }
    });
    return str;
}

function genTargetIncludeDirectories(project: Project, config: Config, tgt: Target): string {
    let str = '';
    conf.compilers(config).forEach((compiler) => {
        const ctx: TargetBuildContext = {
            config,
            compiler,
            target: tgt,
        };
        let items = target.resolveTargetItems(tgt.includeDirectories, ctx);
        const hasInterface = Object.values(items.interface).length > 0;
        const hasPrivate = Object.values(items.private).length > 0;
        const hasPublic = Object.values(items.public).length > 0;
        if (hasInterface || hasPrivate || hasPublic) {
            str += `if (\${CMAKE_C_COMPILER_ID} STREQUAL ${compilerId(compiler)})\n`;
            if (hasInterface) {
                const dirs = items.interface.map((dir) => filePath(tgt.importDir, tgt.dir, dir));
                str += `  target_include_directories(${tgt.name} INTERFACE ${dirs.join(' ')})\n`;
            }
            if (hasPrivate) {
                const dirs = items.private.map((dir) => filePath(tgt.importDir, tgt.dir, dir));
                str += `  target_include_directories(${tgt.name} PRIVATE ${dirs.join(' ')})\n`;
            }
            if (hasPublic) {
                const dirs = items.public.map((dir) => filePath(tgt.importDir, tgt.dir, dir));
                str += `  target_include_directories(${tgt.name} PUBLIC ${dirs.join(' ')})\n`;
            }
            str += 'endif()\n'
        }
    });
    return str;
}

function genTargetCompileDefinitions(project: Project, config: Config, tgt: Target): string {
    let str = '';
    conf.compilers(config).forEach((compiler) => {
        const ctx: TargetBuildContext = {
            config,
            compiler,
            target: tgt,
        };
        const defs = target.resolveTargetItems(tgt.compileDefinitions, ctx);
        const hasInterface = Object.values(defs.interface).length > 0;
        const hasPrivate = Object.values(defs.private).length > 0;
        const hasPublic = Object.values(defs.public).length > 0;
        if (hasInterface || hasPrivate || hasPublic) {
            str += `if (\${CMAKE_C_COMPILER_ID} STREQUAL ${compilerId(compiler)})\n`;
            if (hasInterface) {
                str += `  target_compile_definitions(${tgt.name} INTERFACE ${defs.interface.join(' ')})\n`;
            }
            if (hasPrivate) {
                str += `  target_compile_definitions(${tgt.name} PRIVATE ${defs.private.join(' ')})\n`;
            }
            if (hasPublic) {
                str += `  target_compile_definitions(${tgt.name} PUBLIC ${defs.public.join(' ')})\n`;
            }
            str += 'endif()\n'
        }
    });
    return str;
}

function genTargetCompileOptions(project: Project, config: Config, tgt: Target): string {
    let str = '';
    conf.compilers(config).forEach((compiler) => {
        const ctx: TargetBuildContext = {
            config,
            compiler,
            target: tgt,
        };
        const opts = target.resolveTargetItems(tgt.compileOptions, ctx);
        const hasInterface = opts.interface.length > 0;
        const hasPrivate = opts.private.length > 0;
        const hasPublic = opts.public.length > 0;
        if (hasInterface || hasPrivate || hasPublic) {
            str += `if (\${CMAKE_C_COMPILER_ID} STREQUAL ${compilerId(compiler)})\n`;
            if (hasInterface) {
                str += `  target_compile_options(${tgt.name} INTERFACE ${opts.interface.join(' ')})\n`;
            }
            if (hasPrivate) {
                str += `  target_compile_options(${tgt.name} PRIVATE ${opts.private.join(' ')})\n`;
            }
            if (hasPublic) {
                str += `  target_compile_options(${tgt.name} PUBLIC ${opts.public.join(' ')})\n`;
            }
            str += 'endif()\n'
        }
    });
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
    const aliasMap = util.aliasMap(project, config, config.importDir);
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
            res[key] = util.resolveAlias(val, aliasMap);
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
