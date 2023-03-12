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
    ProjectBuildContext,
    ProjectItemsFunc,
    Target,
    TargetItems,
    TargetBuildContext,
    util,
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

function genCMakeListsTxt(project: Project, config: Config): string {
    let str = '';
    str += genProlog(project, config);
    str += genCompileDefinitions(project, config);
    str += genCompileOptions(project, config);
    str += genLinkOptions(project, config);
    const targets = Object.values(project.targets);
    targets.forEach((target) => {
        str += genTarget(project, config, target);
    });
    targets.forEach((target) => {
        str += genTargetDependencies(project, config, target);
        str += genTargetIncludeDirectories(project, config, target);
        str += genTargetCompileDefinitions(project, config, target);
        str += genTargetCompileOptions(project, config, target);
        str += genTargetLinkOptions(project, config, target);
    });
    return str;
}

function genProlog(project: Project, config: Config): string {
    let str = '';
    str += 'cmake_minimum_required(VERSION 3.20)\n';
    str += `project(${project.name})\n`;
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    if (config.platform === 'emscripten') {
        str += 'set(CMAKE_EXECUTABLE_SUFFIX ".html")\n';
    } else if (config.platform === 'wasi') {
        str += 'set(CMAKE_EXECUTABLE_SUFFIX ".wasm")\n';
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

function genIfCompiler(compiler: Compiler): string {
    return `if (\${CMAKE_C_COMPILER_ID} STREQUAL ${compilerId(compiler)})\n`;
}

function genEndif(): string {
    return 'endif()\n';
}

function genGlobalItems(project: Project, config: Config, statement: string, items: (string | ProjectItemsFunc)[], itemsAreFilePaths: boolean): string {
    let str = '';
    conf.compilers(config).forEach((compiler) => {
        const ctx: ProjectBuildContext = {
            project,
            config,
            compiler,
        };
        const resolvedItems = util.resolveProjectItems(items, ctx, itemsAreFilePaths);
        if (resolvedItems.length > 0) {
            str += genIfCompiler(compiler);
            str += `  ${statement}(${resolvedItems.join(' ')})\n`;
            str += genEndif();
        }
    });
    return str;

}

function genCompileDefinitions(project: Project, config: Config): string {
    return genGlobalItems(project, config, 'add_compile_definitions', project.compileDefinitions, false);
}

function genCompileOptions(project: Project, config: Config): string {
    return genGlobalItems(project, config, 'add_compile_options', project.compileOptions, false);
}

function genLinkOptions(project: Project, config: Config): string {
    return genGlobalItems(project, config, 'add_link_options', project.linkOptions, false);
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
                    subtype = ' MACOSX_BUNDLE';
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
        case 'interface':
            str += `add_library(${target.name} INTERFACE)\n`;
            break;
    }
    if (target.type !== 'interface') {
        const aliasMap = util.buildAliasMap(project, config, target.importDir);
        target.sources.forEach((source) => {
            str += `    ${util.resolveFilePath(target.importDir, target.dir, source, aliasMap)}\n`;
        });
        str += ')\n';
    }
    return str;
}

function genTargetDependencies(project: Project, config: Config, target: Target): string {
    let str = '';
    conf.compilers(config).forEach((compiler) => {
        let libs: string[];
        if (typeof target.libs === 'function') {
            const ctx: TargetBuildContext = {
                project,
                config,
                compiler,
                target,
            };
            libs = target.libs(ctx);
        } else {
            libs = target.libs;
        }
        libs = libs.map((lib) => `"${lib}"`);
        if (libs.length > 0) {
            str += genIfCompiler(compiler);
            if ((target.type === 'lib') || (target.type === 'interface')) {
                str += `  target_link_libraries(${target.name} INTERFACE ${libs.join(' ')})\n`;
            } else {
                str += `  target_link_libraries(${target.name} ${libs.join(' ')})\n`;
            }
            str += genEndif();
        }
    });
    return str;
}

function genTargetItems(project: Project, config: Config, target: Target, statement: string, items: TargetItems, itemsAreFilePaths: boolean): string {
    let str = '';
    conf.compilers(config).forEach((compiler) => {
        const ctx: TargetBuildContext = {
            project,
            config,
            compiler,
            target,
        };
        const resolvedItems = util.resolveTargetItems(items, ctx, itemsAreFilePaths);
        const hasInterface = Object.values(resolvedItems.interface).length > 0;
        const hasPrivate = Object.values(resolvedItems.private).length > 0;
        const hasPublic = Object.values(resolvedItems.public).length > 0;
        if (hasInterface || hasPrivate || hasPublic) {
            str += genIfCompiler(compiler);
            if (hasInterface) {
                str += `  ${statement}(${target.name} INTERFACE ${resolvedItems.interface.join(' ')})\n`;
            }
            if (hasPrivate) {
                str += `  ${statement}(${target.name} PRIVATE ${resolvedItems.private.join(' ')})\n`;
            }
            if (hasPublic) {
                str += `  ${statement}(${target.name} PUBLIC ${resolvedItems.public.join(' ')})\n`;
            }
            str += genEndif();
        }
    });
    return str;

}

function genTargetIncludeDirectories(project: Project, config: Config, target: Target): string {
    return genTargetItems(project, config, target, 'target_include_directories', target.includeDirectories, true);
}

function genTargetCompileDefinitions(project: Project, config: Config, target: Target): string {
    return genTargetItems(project, config, target, 'target_compile_definitions', target.compileDefinitions, false);
}

function genTargetCompileOptions(project: Project, config: Config, target: Target): string {
    return genTargetItems(project, config, target, 'target_compile_options', target.compileOptions, false);
}

function genTargetLinkOptions(project: Project, config: Config, target: Target): string {
    return genTargetItems(project, config, target, 'target_link_options', target.linkOptions, false);
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
        const aliasMap = util.buildAliasMap(project, config, config.importDir);
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

function resolveCacheVariable(val: string | boolean, aliasMap: Record<string, string>): any {
    if (typeof val === 'boolean') {
        return {
            type: 'BOOL',
            value: val ? 'ON' : 'OFF',
        };
    } else {
        return util.resolveAlias(val, aliasMap);
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
    const projectAliasMap = util.buildAliasMap(project, config, project.dir);
    for (const key in project.variables) {
        res[key] = resolveCacheVariable(project.variables[key], projectAliasMap);
    }
    const configAliasMap = util.buildAliasMap(project, config, config.importDir);
    for (const key in config.variables) {
        res[key] = resolveCacheVariable(config.variables[key], configAliasMap);
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
