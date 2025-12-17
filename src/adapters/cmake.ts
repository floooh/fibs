import { cmake, log, util } from '../lib/index.ts';
import { fs } from '../../deps.ts';
import {
    AdapterBuildOptions,
    AdapterConfigureResult,
    AdapterDesc,
    BuildMode,
    Compiler,
    Config,
    Project,
} from '../types.ts';

export const cmakeAdapter: AdapterDesc = {
    name: 'cmake',
    configure,
    generate,
    build,
};

const helloSource = `
#include <stdio.h>
int main() {
  printf("Hello World!\\n);
  return 0;
}
`;

const cmakeConfigSource = `
cmake_minimum_required(VERSION 4.0)
project(hello C CXX)
add_executable(hello hello.c)
file(WRITE cmake_config.json "{\\"CMAKE_C_COMPILER_ID\\":\\"\${CMAKE_C_COMPILER_ID}\\",\\"CMAKE_HOST_SYSTEM_NAME\\":\\"\${CMAKE_HOST_SYSTEM_NAME}\\",\\"CMAKE_SYSTEM_PROCESSOR\\":\\"\${CMAKE_SYTEM_PROCESSOR}\\"}\\n")
`;

export async function configure(project: Project, config: Config): Promise<AdapterConfigureResult> {
    const configDir = project.configDir(config.name);
    const configPath = `${configDir}/cmake_config.json`;
    if (!util.fileExists(configPath)) {
        fs.ensureDirSync(configDir);
        // run a dummy cmake generator to obtain runtime config params
        const helloPath = `${configDir}/hello.c`;
        Deno.writeTextFileSync(helloPath, helloSource, { create: true });

        const cmakePath = `${configDir}/CMakeLists.txt`;
        Deno.writeTextFileSync(cmakePath, cmakeConfigSource, { create: true });

        const cmakePresetsPath = `${configDir}/CMakePresets.json`;
        const cmakePresetsSource = genCMakePresetsJson(project, config, configDir, configDir);
        Deno.writeTextFileSync(cmakePresetsPath, cmakePresetsSource, { create: true });

        const res = await cmake.run({ cwd: configDir, args: ['--preset', config.name], stderr: 'piped' });
        if (res.exitCode !== 0) {
            log.panic(`cmake returned with exit code ${res.exitCode}, stderr: \n\n${res.stderr}`);
        }
    }

    const configJson = (await import(configPath, { with: { type: 'json' } })).default;
    return {
        compiler: fromCmakeCompiler(configJson.CMAKE_C_COMPILER_ID),
    };
}

export async function generate(project: Project, config: Config): Promise<void> {
    const cmakeListsPath = `${project.dir()}/CMakeLists.txt`;
    const cmakePresetsPath = `${project.dir()}/CMakePresets.json`;
    log.info(`writing ${cmakeListsPath}`);
    try {
        Deno.writeTextFileSync(
            cmakeListsPath,
            genCMakeListsTxt(project, config),
            { create: true },
        );
    } catch (err) {
        log.panic(`Failed writing ${cmakeListsPath}: `, err);
    }
    log.info(`writing ${cmakePresetsPath}`);
    try {
        Deno.writeTextFileSync(
            cmakePresetsPath,
            genCMakePresetsJson(project, config, project.buildDir(), project.distDir()),
            { create: true },
        );
    } catch (err) {
        log.panic('Failed writing CMakePresets.json: ', err);
    }
    await cmake.generate(project, config);
}

export async function build(project: Project, config: Config, options: AdapterBuildOptions): Promise<void> {
    log.info('cmake.build() called!');
}

function genCMakePresetsJson(project: Project, config: Config, buildDir: string, distDir: string): string {
    let preset = {
        version: 3,
        cmakeMinimumRequired: {
            major: 4,
            minor: 0,
            patch: 0,
        },
        configurePresets: genConfigurePresets(project, config, buildDir, distDir),
        buildPresets: genBuildPresets(config),
    };
    return JSON.stringify(preset, null, 2);
}

function fromCmakeCompiler(str: string): Compiler {
    if (str === 'AppleClang') {
        return 'appleclang';
    } else if (str === 'Clang') {
        return 'clang';
    } else if (str === 'GNU') {
        return 'gcc';
    } else if (str === 'MSVC') {
        return 'msvc';
    } else {
        return 'unknown-compiler';
    }
}

function asCmakeGenerator(config: Config): string | undefined {
    switch (config.generator) {
        case 'make':
            return 'Unix Makefiles';
        case 'ninja':
            return 'Ninja';
        case 'ninja-multi-config':
            return 'Ninja Multi-Config';
        case 'xcode':
            return 'Xcode';
        default:
            return undefined;
    }
}

function asCmakeBuildMode(buildMode: BuildMode): string {
    if (buildMode === 'debug') {
        return 'Debug';
    } else {
        return 'Release';
    }
}

function isMultiConfigGenerator(config: Config): boolean {
    switch (config.generator) {
        case 'make':
        case 'ninja':
            return false;
        case 'vstudio':
        case 'ninja-multi-config':
        case 'xcode':
            return true;
        default:
            return config.platform === 'windows';
    }
}

function resolveCacheVariable(val: string | boolean): any {
    if (typeof val === 'string') {
        return val;
    } else {
        return {
            type: 'BOOL',
            value: val ? 'ON' : 'OFF',
        };
    }
}

function genConfigurePresets(project: Project, config: Config, buildDir: string, distDir: string): unknown[] {
    const res = [];
    if (util.validConfigForPlatform(config, project.hostPlatform())) {
        res.push({
            name: config.name,
            displayName: config.name,
            binaryDir: buildDir,
            generator: asCmakeGenerator(config),
            toolchainFile: config.toolchainFile,
            cacheVariables: genCacheVariables(project, config, distDir),
            environment: config.environment,
        });
    } else {
        log.panic(`config '${config.name} is not valid for platform '${project.hostPlatform()}`);
    }
    return res;
}

function genCacheVariables(project: Project, config: Config, distDir: string): Record<string, unknown> {
    let res: Record<string, any> = {};
    if (!isMultiConfigGenerator(config)) {
        res.CMAKE_BUILD_TYPE = asCmakeBuildMode(config.buildMode);
    }
    if (config.platform !== 'android') {
        res.CMAKE_RUNTIME_OUTPUT_DIRECTORY = distDir;
    }
    for (const cmakeVariable of project.cmakeVariables()) {
        res[cmakeVariable.name] = resolveCacheVariable(cmakeVariable.value);
    }
    for (const key in config.cmakeVariables) {
        res[key] = resolveCacheVariable(config.cmakeVariables[key]);
    }
    return res;
}

function genBuildPresets(config: Config): unknown[] {
    if (isMultiConfigGenerator(config)) {
        return [
            { name: 'default', configurePreset: config.name, configuration: asCmakeBuildMode(config.buildMode) },
            { name: 'debug', configurePreset: config.name, configuration: asCmakeBuildMode('debug') },
            { name: 'release', configurePreset: config.name, configuration: asCmakeBuildMode('release') },
        ];
    } else {
        return [{ name: 'default', configurePreset: config.name }];
    }
}

function genCMakeListsTxt(project: Project, config: Config): string {
    let str = '';
    str += genProlog(project, config);
    str += genIncludeDirectories(project, config);
    str += genCompileDefinitions(project, config);
    str += genCompileOptions(project, config);
    str += genLinkOptions(project, config);
    str += genAllJobsTarget(project, config);
    /* FIXME
    for (const target of project.targets()) {
        str += genTarget(project, config, target);
        str += genTargetDependencies(project, config, target);
        str += genTargetIncludeDirectories(project, config, target);
        str += genTargetCompileDefinitions(project, config, target);
        str += genTargetCompileOptions(project, config, target);
        str += genTargetLinkOptions(project, config, target);
        str += genTargetJobDependencies(project, config, target);
    }
    */
    return str;
}

function genProlog(project: Project, config: Config): string {
    let str = '';
    str += 'cmake_minimum_required(VERSION 4.0)\n';
    str += `project(${project.name()} C CXX)\n`;
    str += 'set(GLOBAL PROPERTY USE_FOLDERS ON)\n';
    str += 'set(CMAKE_CONFIGURATION_TYPES Debug Release)\n';
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    for (const includeDir of config.cmakeIncludes) {
        str += `include("${includeDir}")\n`;
    }
    return str;
}

function genIncludeDirectories(project: Project, config: Config): string {
    let str = '';
    const dirs = [...project.includeDirectories(), ...config.includeDirectories];
    if (dirs.length > 0) {
        str += 'include_directories(';
        dirs.forEach((dir) => str += `\n"  ${dir}"`);
        str += ')\n';
    }
    return str;
}

function genCompileDefinitions(project: Project, config: Config): string {
    let str = '';
    const defs = { ...project.compileDefinitions(), ...config.compileDefinitions };
    if (defs.length > 0) {
        str += 'add_compile_definitions(';
        defs.forEach((def) => `\n  ${def.key}=${def.val}`);
        str += ')\n';
    }
    return str;
}

function genCompileOptions(project: Project, config: Config): string {
    let str = '';
    const opts = [...project.compileOptions(), ...config.compileOptions];
    if (opts.length > 0) {
        str += 'add_compile_options(';
        opts.forEach((opt) => str += `\n  ${opt}`);
        str += ')\n';
    }
    return str;
}

function genLinkOptions(project: Project, config: Config): string {
    let str = '';
    const opts = [...project.linkOptions(), ...config.linkOptions];
    if (opts.length > 0) {
        str += 'add_link_options(';
        opts.forEach((opt) => str += `\n  ${opt}`);
        str += ')\n';
    }
    return str;
}

function genAllJobsTarget(project: Project, config: Config): string {
    let str = '';
    // first check if there are any jobs
    let hasJobs: boolean = false;
    for (const target of project.targets()) {
        if (target.jobs.length > 0) {
            hasJobs = true;
            break;
        }
    }
    if (hasJobs) {
        str += `find_program(DENO deno REQUIRED)\n`;
        str +=
            `add_custom_target(ALL_JOBS COMMAND \${DENO} run --allow-all --no-config fibs.ts runjobs WORKING_DIRECTORY ${project.dir()})\n`;
    }
    return str;
}

/*
export async function build(
    project: Project,
    config: Config,
    options: { buildTarget?: string; forceRebuild?: boolean },
) {
    if (!util.fileExists(`${util.buildDir(project, config)}/CMakeCache.txt`)) {
        await configure(project, config);
    }
    await cmake.build(project, config, options);
}

function compilerId(compiler: Compiler): string {
    switch (compiler) {
        case 'msvc':
            return 'MSVC';
        case 'gcc':
            return 'GNU';
        case 'clang':
            return 'Clang';
        case 'appleclang':
            return 'AppleClang';
        case 'unknown-compiler':
            return 'UNKNOWN-COMPILER';
    }
}

function languageId(language: Language): string {
    switch (language) {
        case 'c':
            return 'C';
        case 'cxx':
            return 'CXX';
    }
}

function languages(): Language[] {
    return ['c', 'cxx'];
}

function generatorExpressionLanguageCompiler(language: Language, compiler: Compiler, items: string[]): string {
    return `"$<$<COMPILE_LANG_AND_ID:${languageId(language)},${compilerId(compiler)}>:${items.join(';')}>"`;
}

function generatorExpressionCompiler(compiler: Compiler, items: string[]): string {
    return `"$<$<C_COMPILER_ID:${compilerId(compiler)}>:${items.join(';')}>"`;
}

function genGlobalArrayItemsLanguageCompiler(
    project: Project,
    config: Config,
    statement: string,
    items: StringArrayFunc[] | string[],
    itemsAreFilePaths: boolean,
    useConfigAliases: boolean,
): string {
    let str = '';
    const aliasMap = useConfigAliases
        ? util.buildConfigAliasMap(project, config)
        : util.buildProjectAliasMap(project, config);
    for (const language of languages()) {
        for (const compiler of config.compilers) {
            const ctx: Context = {
                project,
                config,
                compiler,
                language,
                aliasMap,
                host: { platform: host.platform(), arch: host.arch() },
            };
            const resolvedItems = proj.resolveProjectStringArray(items, ctx, itemsAreFilePaths);
            if (resolvedItems.length > 0) {
                str += `${statement}(${generatorExpressionLanguageCompiler(language, compiler, resolvedItems)})\n`;
            }
        }
    }
    return str;
}

function genGlobalRecordItemsLanguageCompiler(
    project: Project,
    config: Config,
    statement: string,
    items: StringRecordFunc[] | Record<string, string>,
    itemsAreFilePaths: boolean,
    useConfigAliases: boolean,
): string {
    let str = '';
    const aliasMap = useConfigAliases
        ? util.buildConfigAliasMap(project, config)
        : util.buildProjectAliasMap(project, config);
    for (const language of languages()) {
        for (const compiler of config.compilers) {
            const ctx: Context = {
                project,
                config,
                compiler,
                language,
                aliasMap,
                host: { platform: host.platform(), arch: host.arch() },
            };
            const resolvedItems = proj.resolveProjectStringRecord(items, ctx, itemsAreFilePaths);
            if (Object.keys(resolvedItems).length > 0) {
                const resolvedItemsString = Object.entries(resolvedItems).map(([key, val]) => `${key}=${val}`);
                str += `${statement}(${
                    generatorExpressionLanguageCompiler(language, compiler, resolvedItemsString)
                })\n`;
            }
        }
    }
    return str;
}

function genCompileOptions(project: Project, config: Config): string {
    let str = '';
    str += genGlobalArrayItemsLanguageCompiler(
        project,
        config,
        'add_compile_options',
        project.compileOptions,
        false,
        false,
    );
    str += genGlobalArrayItemsLanguageCompiler(
        project,
        config,
        'add_compile_options',
        config.compileOptions,
        false,
        true,
    );
    return str;
}

function genLinkOptions(project: Project, config: Config): string {
    let str = '';
    str += genGlobalArrayItemsLanguageCompiler(project, config, 'add_link_options', project.linkOptions, false, false);
    str += genGlobalArrayItemsLanguageCompiler(project, config, 'add_link_options', config.linkOptions, false, true);
    return str;
}

function genTarget(project: Project, config: Config, target: Target): string {
    let str = '';
    const ctx: Context = {
        project,
        config,
        target,
        aliasMap: util.buildTargetAliasMap(project, config, target),
        host: { platform: host.platform(), arch: host.arch() },
    };
    const sources = proj.resolveTargetStringArray(target.sources, ctx, true);

    // get any job outputs which need to be added as target sources
    const jobOutputs = proj.resolveTargetJobs(ctx).flatMap((job) => {
        if (job.addOutputsToTargetSources) {
            return job.outputs;
        } else {
            return [];
        }
    });

    // need to create an empy dummy for any job output file that doesn't exist yet
    for (const path of jobOutputs) {
        util.ensureFile(path);
    }

    const targetSources = [...sources, ...jobOutputs];
    const targetSourcesStr = targetSources.join(' ');
    let subtype = '';
    switch (target.type) {
        case 'plain-exe':
        case 'windowed-exe':
            if (target.type === 'windowed-exe') {
                if (config.platform === 'windows') {
                    subtype = ' WIN32';
                } else if ((config.platform === 'macos') || (config.platform === 'ios')) {
                    subtype = ' MACOSX_BUNDLE';
                }
            }
            str += `add_executable(${target.name}${subtype} ${targetSourcesStr})\n`;
            break;
        case 'lib':
            str += `add_library(${target.name} STATIC ${targetSourcesStr})\n`;
            break;
        case 'dll':
            str += `add_library(${target.name} SHARED ${targetSourcesStr})\n`;
            break;
        case 'interface':
            str += `add_library(${target.name} INTERFACE ${targetSourcesStr})\n`;
            break;
    }
    const aliasMap = util.buildTargetAliasMap(project, config, target);
    str += `source_group(TREE ${util.resolvePath(aliasMap, target.importDir, target.dir)} FILES ${
        sources.join(' ')
    })\n`;
    if (jobOutputs.length > 0) {
        str += `source_group(gen FILES ${jobOutputs.join(' ')})\n`;
    }
    return str;
}

function genTargetDependencies(project: Project, config: Config, target: Target): string {
    let str = '';
    const aliasMap = util.buildTargetAliasMap(project, config, target);
    for (const compiler of config.compilers) {
        const ctx: Context = {
            project,
            config,
            target,
            compiler,
            aliasMap,
            host: { platform: host.platform(), arch: host.arch() },
        };
        const libs = [
            ...proj.resolveTargetStringArray(target.deps, ctx, false),
            ...proj.resolveTargetStringArray(target.libs, ctx, false),
        ];
        if (libs.length > 0) {
            let type = '';
            if (target.type === 'interface') {
                type = ' INTERFACE';
            }
            str += `target_link_libraries(${target.name}${type} ${generatorExpressionCompiler(compiler, libs)})\n`;
        }
    }
    return str;
}

function genTargetArrayItems(
    project: Project,
    config: Config,
    target: Target,
    statement: string,
    items: TargetArrayItems,
    itemsAreFilePaths: boolean,
): string {
    let str = '';
    const aliasMap = util.buildTargetAliasMap(project, config, target);
    for (const language of languages()) {
        for (const compiler of config.compilers) {
            const ctx: Context = {
                project,
                config,
                target,
                compiler,
                language,
                aliasMap,
                host: { platform: host.platform(), arch: host.arch() },
            };
            const resolvedItems = proj.resolveTargetArrayItems(items, ctx, itemsAreFilePaths);
            if (resolvedItems.interface.length > 0) {
                str += `${statement}(${target.name} INTERFACE ${
                    generatorExpressionLanguageCompiler(language, compiler, resolvedItems.interface)
                })\n`;
            }
            if (resolvedItems.private.length > 0) {
                str += `${statement}(${target.name} PRIVATE ${
                    generatorExpressionLanguageCompiler(language, compiler, resolvedItems.private)
                })\n`;
            }
            if (resolvedItems.public.length > 0) {
                str += `${statement}(${target.name} PUBLIC ${
                    generatorExpressionLanguageCompiler(language, compiler, resolvedItems.public)
                })\n`;
            }
        }
    }
    return str;
}

function genTargetRecordItems(
    project: Project,
    config: Config,
    target: Target,
    statement: string,
    items: TargetRecordItems,
    itemsAreFilePaths: boolean,
): string {
    let str = '';
    const aliasMap = util.buildTargetAliasMap(project, config, target);
    for (const language of languages()) {
        for (const compiler of config.compilers) {
            const ctx: Context = {
                project,
                config,
                target,
                compiler,
                language,
                aliasMap,
                host: { platform: host.platform(), arch: host.arch() },
            };
            const resolvedItems = proj.resolveTargetRecordItems(items, ctx, itemsAreFilePaths);
            if (Object.keys(resolvedItems.interface).length > 0) {
                const resolvedItemsString = Object.entries(resolvedItems.interface).map(([key, val]) =>
                    `${key}=${val}`
                );
                str += `${statement}(${target.name} INTERFACE ${
                    generatorExpressionLanguageCompiler(language, compiler, resolvedItemsString)
                })\n`;
            }
            if (Object.keys(resolvedItems.private).length > 0) {
                const resolvedItemsString = Object.entries(resolvedItems.private).map(([key, val]) => `${key}=${val}`);
                str += `${statement}(${target.name} PRIVATE ${
                    generatorExpressionLanguageCompiler(language, compiler, resolvedItemsString)
                })\n`;
            }
            if (Object.keys(resolvedItems.public).length > 0) {
                const resolvedItemsString = Object.entries(resolvedItems.public).map(([key, val]) => `${key}=${val}`);
                str += `${statement}(${target.name} PUBLIC ${
                    generatorExpressionLanguageCompiler(language, compiler, resolvedItemsString)
                })\n`;
            }
        }
    }
    return str;
}

function genTargetIncludeDirectories(project: Project, config: Config, target: Target): string {
    return genTargetArrayItems(project, config, target, 'target_include_directories', target.includeDirectories, true);
}

function genTargetCompileDefinitions(project: Project, config: Config, target: Target): string {
    return genTargetRecordItems(
        project,
        config,
        target,
        'target_compile_definitions',
        target.compileDefinitions,
        false,
    );
}

function genTargetCompileOptions(project: Project, config: Config, target: Target): string {
    return genTargetArrayItems(project, config, target, 'target_compile_options', target.compileOptions, false);
}

function genTargetLinkOptions(project: Project, config: Config, target: Target): string {
    return genTargetArrayItems(project, config, target, 'target_link_options', target.linkOptions, false);
}

function genTargetJobDependencies(project: Project, config: Config, target: Target) {
    let str = '';
    if (target.jobs.length > 0) {
        str += `add_dependencies(${target.name} ALL_JOBS)\n`;
    }
    return str;
}

*/
