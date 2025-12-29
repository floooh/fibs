import { cmake, log, proj, util } from '../lib/index.ts';
import {
    type AdapterBuildOptions,
    type AdapterConfigureResult,
    type AdapterDesc,
    type BuildMode,
    type Compiler,
    type Config,
    type Generator,
    type Language,
    type Project,
    ProjectPhase,
    type Scope,
    type Target,
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
cmake_minimum_required(VERSION 3.21)
project(hello C CXX)
add_executable(hello hello.c)
file(WRITE cmake_config.json "{\\"CMAKE_C_COMPILER_ID\\":\\"\${CMAKE_C_COMPILER_ID}\\",\\"CMAKE_HOST_SYSTEM_NAME\\":\\"\${CMAKE_HOST_SYSTEM_NAME}\\",\\"CMAKE_SYSTEM_PROCESSOR\\":\\"\${CMAKE_SYTEM_PROCESSOR}\\"}\\n")
`;

export async function configure(project: Project): Promise<AdapterConfigureResult> {
    const config = project.activeConfig();
    const configDir = project.configDir(config.name);
    const configPath = `${configDir}/cmake_config.json`;
    if (!util.fileExists(configPath)) {
        util.ensureDir(configDir);
        // run a dummy cmake generator to obtain runtime config params
        const helloPath = `${configDir}/hello.c`;
        Deno.writeTextFileSync(helloPath, helloSource, { create: true });

        const cmakePath = `${configDir}/CMakeLists.txt`;
        Deno.writeTextFileSync(cmakePath, cmakeConfigSource, { create: true });

        const cmakePresetsPath = `${configDir}/CMakePresets.json`;
        const cmakePresetsSource = genCMakePresetsJson(project, config, configDir);
        Deno.writeTextFileSync(cmakePresetsPath, cmakePresetsSource, { create: true });

        const res = await cmake.run({ cwd: configDir, args: ['--preset', config.name], stderr: 'piped', stdout: 'piped' });
        if (res.exitCode !== 0) {
            log.panic(`cmake returned with exit code ${res.exitCode}, stderr: \n\n${res.stderr}`);
        }
    }
    const importPath = `file://${configPath}`;
    const configJson = (await import(importPath, { with: { type: 'json' } })).default;
    return {
        compiler: fromCmakeCompiler(configJson.CMAKE_C_COMPILER_ID),
    };
}

export async function generate(project: Project): Promise<void> {
    const config = project.activeConfig();
    const cmakeListsPath = `${project.dir()}/CMakeLists.txt`;
    const cmakePresetsPath = `${project.dir()}/CMakePresets.json`;
    try {
        Deno.writeTextFileSync(
            cmakeListsPath,
            genCMakeListsTxt(project, config),
            { create: true },
        );
    } catch (err) {
        log.panic(`Failed writing ${cmakeListsPath}: `, err);
    }
    try {
        Deno.writeTextFileSync(
            cmakePresetsPath,
            genCMakePresetsJson(project, config, project.buildDir()),
            { create: true },
        );
    } catch (err) {
        log.panic('Failed writing CMakePresets.json: ', err);
    }
    await cmake.generate(project, config);
}

export async function build(project: Project, options: AdapterBuildOptions): Promise<void> {
    if (!util.fileExists(`${project.buildDir()}/CMakeCache.txt`)) {
        await generate(project);
    }
    const { buildTarget, forceRebuild } = options;
    await cmake.build({ target: buildTarget, forceRebuild: forceRebuild });
}

function genCMakePresetsJson(project: Project, config: Config, buildDir: string): string {
    const preset = {
        version: 3,
        cmakeMinimumRequired: {
            major: 3,
            minor: 21,
            patch: 0,
        },
        configurePresets: [
            {
                name: config.name,
                displayName: config.name,
                binaryDir: buildDir,
                generator: asCmakeGenerator(config.generator),
                toolchainFile: config.toolchainFile,
                cacheVariables: genCacheVariables(project, config),
                environment: config.environment,
            },
        ],
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

function asCmakeGenerator(g: Generator | undefined): string | undefined {
    switch (g) {
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

function asCmakeScope(scope: Scope): string {
    return ` ${scope.toUpperCase()}`;
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

function resolveCacheVariable(val: string | boolean): string | { type: 'BOOL'; value: 'ON' | 'OFF' } {
    if (typeof val === 'string') {
        return val;
    } else {
        return {
            type: 'BOOL',
            value: val ? 'ON' : 'OFF',
        };
    }
}

function genCacheVariables(project: Project, config: Config): Record<string, unknown> {
    const res: Record<string, unknown> = {};
    if (!isMultiConfigGenerator(config)) {
        res.CMAKE_BUILD_TYPE = asCmakeBuildMode(config.buildMode);
    }
    if (project.phase() === ProjectPhase.Generate) {
        for (const cmakeVariable of project.cmakeVariables()) {
            res[cmakeVariable.name] = resolveCacheVariable(cmakeVariable.value);
        }
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
    str += genProlog(project);
    str += genMisc(project);
    str += genIncludeDirectories(project);
    str += genCompileDefinitions(project);
    str += genCompileOptions(project);
    str += genLinkOptions(project);
    str += genAllJobsTarget(project, config);
    for (const target of project.targets()) {
        str += genTarget(project, config, target);
        str += genTargetDependencies(target);
        str += genTargetIncludeDirectories(target);
        str += genTargetCompileDefinitions(target);
        str += genTargetCompileOptions(target);
        str += genTargetLinkOptions(target);
        str += genTargetProperties(target);
        str += genTargetJobDependencies(target);
        str += genTargetMisc(project, target);
    }
    return str;
}

function genProlog(project: Project): string {
    let str = '';
    str += 'cmake_minimum_required(VERSION 3.21)\n';
    str += `project(${project.name()} C CXX)\n`;
    str += 'set(GLOBAL PROPERTY USE_FOLDERS ON)\n';
    str += 'set(CMAKE_CONFIGURATION_TYPES Debug Release)\n';
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    str += 'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_RUNTIME_OUTPUT_DIRECTORY})\n';
    for (const includeDir of project.cmakeIncludes()) {
        str += `include("${includeDir.path}")\n`;
    }
    return str;
}

function expr(l: Language | undefined, m: BuildMode | undefined, str: string): string {
    switch (l) {
        case 'c':
            str = `$<$<COMPILE_LANGUAGE:C>:${str}>`;
            break;
        case 'cxx':
            str = `$<$<COMPILE_LANGUAGE:CXX>:${str}>`;
            break;
    }
    switch (m) {
        case 'debug':
            str = `$<$<CONFIG:DEBUG>:${str}>`;
            break;
        case 'release':
            str = `$<$<CONFIG:RELEASE>:${str}>`;
            break;
    }
    return str;
}

function genIncludeDirectories(project: Project): string {
    let str = '';
    project.includeDirectories().forEach((item) =>
        str += `include_directories(${item.system ? 'SYSTEM ' : ''}"${expr(item.language, item.buildMode, item.dir)}")\n`
    );
    return str;
}

function genCompileDefinitions(project: Project): string {
    let str = '';
    const items = project.compileDefinitions();
    if (items.length > 0) {
        str += 'add_compile_definitions(';
        str += items.map((item) => `${expr(item.language, item.buildMode, `${item.name}=${item.val}`)}`).join(' ');
        str += ')\n';
    }
    return str;
}

function genCompileOptions(project: Project): string {
    let str = '';
    const items = project.compileOptions();
    if (items.length > 0) {
        str += 'add_compile_options(';
        str += items.map((item) => `${expr(item.language, item.buildMode, item.opt)}`).join(' ');
        str += ')\n';
    }
    return str;
}

function genLinkOptions(project: Project): string {
    let str = '';
    const items = project.linkOptions();
    if (items.length > 0) {
        str += 'add_link_options(';
        str += items.map((item) => `${expr(undefined, item.buildMode, item.opt)}`).join(' ');
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
            `add_custom_target(ALL_JOBS COMMAND \${DENO} run --allow-all --no-config jsr:@floooh/fibs runjobs ${config.name} WORKING_DIRECTORY ${project.dir()})\n`;
    }
    return str;
}

function genTarget(project: Project, config: Config, target: Target): string {
    const jobOutputs = proj.resolveTargetJobs(project, config, target).flatMap((job) => {
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

    let str = '';
    const targetSources = [...target.sources, ...jobOutputs];
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
    str += `source_group(TREE ${target.dir} FILES ${target.sources.join(' ')})\n`;
    if (jobOutputs.length > 0) {
        str += `source_group(gen FILES ${jobOutputs.join(' ')})\n`;
    }
    return str;
}

function genTargetDependencies(target: Target): string {
    let str = '';
    const scope = target.type === 'interface' ? ' INTERFACE' : '';
    const libs = [...target.deps, ...target.libs];
    if (libs.length > 0) {
        str += `target_link_libraries(${target.name}${scope} ${libs.join(' ')})\n`;
    }
    // macOS frameworks need special formatting
    const fws = target.frameworks;
    if (fws.length > 0) {
        str += `target_link_libraries(${target.name}${scope} ${fws.map((fw) => `"-framework ${fw}"`).join(' ')})\n`;
    }
    return str;
}

function genTargetIncludeDirectories(target: Target): string {
    let str = '';
    target.includeDirectories.forEach((item) => {
        const sys = item.system ? ' SYSTEM' : '';
        const scope = asCmakeScope(item.scope);
        str += `target_include_directories(${target.name}${sys}${scope} "${expr(item.language, item.buildMode, item.dir)}")\n`;
    });
    return str;
}

function genTargetCompileDefinitions(target: Target): string {
    let str = '';
    const items = target.compileDefinitions;
    if (items.length > 0) {
        str += `target_compile_definitions(${target.name}`;
        str += items.map((item) => `${asCmakeScope(item.scope)} ${expr(item.language, item.buildMode, `${item.name}=${item.val}`)}`).join(
            ' ',
        );
        str += ')\n';
    }
    return str;
}

function genTargetCompileOptions(target: Target): string {
    let str = '';
    const items = target.compileOptions;
    if (items.length > 0) {
        str += `target_compile_options(${target.name}`;
        str += items.map((item) => `${asCmakeScope(item.scope)} ${expr(item.language, item.buildMode, item.opt)}`).join(' ');
        str += ')\n';
    }
    return str;
}

function genTargetLinkOptions(target: Target): string {
    let str = '';
    const items = target.linkOptions;
    if (items.length > 0) {
        str += `target_link_options(${target.name}`;
        str += items.map((item) => `${asCmakeScope(item.scope)} ${expr(undefined, item.buildMode, item.opt)}`).join(' ');
        str += ')\n';
    }
    return str;
}

function genTargetProperties(target: Target): string {
    let str = '';
    const items = Object.entries(target.props);
    if (items.length > 0) {
        str += `set_target_properties(${target.name} PROPERTIES `;
        str += items.map(([key, val]) => `${key} ${val}`).join(' ');
        str += ')\n';
    }
    return str;
}

function genTargetJobDependencies(target: Target) {
    let str = '';
    if (target.jobs.length > 0) {
        str += `add_dependencies(${target.name} ALL_JOBS)\n`;
    }
    return str;
}

function genMisc(project: Project) {
    let str = '';
    // Linux pthread handling
    if (project.isLinux()) {
        str += `set(THREADS_PREFER_PTHREAD_FLAG TRUE)\n`;
        str += `find_package(Threads)\n`;
    }
    return str;
}

function genTargetMisc(project: Project, target: Target) {
    let str = '';
    if (project.isMsvc()) {
        if ((target.type === 'plain-exe') || (target.type === 'windowed-exe')) {
            // set debug output directory to the target dist dir
            str += `set_target_properties(${target.name} PROPERTIES VS_DEBUGGER_WORKING_DIRECTORY ${project.targetDistDir(target.name)})\n`;
            // write a custom command which copies any linked DLLs into the target dist dir
            str +=
                `add_custom_command(TARGET ${target.name} POST_BUILD COMMAND "\${CMAKE_COMMAND}" -E copy -t "$<TARGET_FILE_DIR:${target.name}>" "$<TARGET_RUNTIME_DLLS:${target.name}>" USES_TERMINAL COMMAND_EXPAND_LISTS)\n`;
        }
    }
    if (project.isLinux()) {
        if ((target.type === 'plain-exe') || (target.type === 'windowed-exe')) {
            // optional -pthread flag
            str += `target_link_libraries(${target.name} Threads::Threads)\n`;
        }
    }
    return str;
}
