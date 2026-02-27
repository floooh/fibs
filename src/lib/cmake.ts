import os from 'node:os';
import { log, util } from './index.ts';
import type { Compiler, Config, Project, RunOptions, RunResult } from '../types.ts';
import { CMakeMinimumRequired, genCMakeListsTxt, genCMakePresetsJson } from './generate.ts';

const helloSource = `
#include <stdio.h>
int main() {
  printf("Hello World!\\n);
  return 0;
}
`;

const cmakeConfigSource = `
cmake_minimum_required(VERSION ${CMakeMinimumRequired})
project(hello C CXX)
add_executable(hello hello.c)
file(WRITE cmake_config.json "{\\"CMAKE_C_COMPILER_ID\\":\\"\${CMAKE_C_COMPILER_ID}\\",\\"CMAKE_HOST_SYSTEM_NAME\\":\\"\${CMAKE_HOST_SYSTEM_NAME}\\",\\"CMAKE_SYSTEM_PROCESSOR\\":\\"\${CMAKE_SYTEM_PROCESSOR}\\"}\\n")
`;

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.runCmd('cmake', options);
    } catch (err) {
        throw new Error('Failed running cmake', { cause: err });
    }
}

export async function exists(): Promise<boolean> {
    try {
        await run({ args: ['--version'], stdout: 'null', showCmd: false });
        return true;
    } catch (_err) {
        return false;
    }
}

/**
 * Run the cmake configure 'pre-pass'. This is used to determine runtime
 * properties like the compiler id.
 *
 * @param project the Project object
 * @param config a build config
 * @returns a result object containing the identified compiler
 * @throws throw if cmake returns with an exit code !== 0
 */
export async function configure(project: Project, config: Config): Promise<{ compiler: Compiler }> {
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
        const cmakePresetsSource = genCMakePresetsJson(config, configDir);
        Deno.writeTextFileSync(cmakePresetsPath, cmakePresetsSource, { create: true });

        const res = await run({
            cwd: configDir,
            args: ['--preset', config.name],
            stderr: 'inherit',
            stdout: log.verbose() ? 'inherit' : 'null',
            showCmd: log.verbose(),
        });
        if (res.exitCode !== 0) {
            throw new Error(`cmake returned with exit code ${res.exitCode} (run with --verbose)`);
        }
    }
    const importPath = `file://${configPath}`;
    const configJson = (await import(importPath, { with: { type: 'json' } })).default;
    return {
        compiler: fromCmakeCompiler(configJson.CMAKE_C_COMPILER_ID),
    };
}

/**
 * Generates the CMakeLists.txt and CMakePresets.json files and runs cmake
 * to generate build files.
 *
 * @param project the Project object
 * @param config a build config
 * @throws throws when writing the files fails
 */
export async function generate(project: Project, config: Config) {
    const cmakeListsPath = `${project.dir()}/CMakeLists.txt`;
    const cmakePresetsPath = `${project.dir()}/CMakePresets.json`;
    try {
        Deno.writeTextFileSync(
            cmakeListsPath,
            genCMakeListsTxt(project, config),
            { create: true },
        );
    } catch (err) {
        throw new Error(`Failed writing ${cmakeListsPath}`, { cause: err });
    }
    try {
        Deno.writeTextFileSync(
            cmakePresetsPath,
            genCMakePresetsJson(config, project.buildDir()),
            { create: true },
        );
    } catch (err) {
        throw new Error('Failed writing CMakePresets.json: ', { cause: err });
    }
    if (config.opener !== undefined) {
        await config.opener.generate(project, config);
    }
    const args = ['--preset', config.name, '-B', project.buildDir(config.name)];
    const res = await run({
        args,
        stderr: 'inherit',
        stdout: log.verbose() ? 'inherit' : 'null',
        showCmd: log.verbose(),
    });
    if (res.exitCode !== 0) {
        throw new Error(`cmake returned with exit code ${res.exitCode} (run with --verbose)`);
    }
}

/**
 * Runs cmake in build mode, generates the cmake files if needed.
 *
 * @param project the Project object
 * @param config a buil config
 * @param options build optional target and rebuild flag
 * @throws throws when generation or on build error
 */
export async function build(project: Project, config: Config, options: { target?: string; forceRebuild?: boolean }) {
    const {
        target,
        forceRebuild = false,
    } = options;

    if (!util.fileExists(`${project.buildDir()}/CMakeCache.txt`)) {
        await generate(project, config);
    }
    // cmake + make with --parallel will heavily overcommit, so limit to available cores
    const parallelism = config.generator === 'make' ? os.availableParallelism() : undefined;

    let args = ['--build', '--preset', 'default'];
    if (parallelism === undefined) {
        args.push('--parallel');
    } else {
        args.push('--parallel', parallelism.toString());
    }
    if (target !== undefined) {
        args = [...args, '--target', target];
    }
    if (forceRebuild) {
        args = [...args, '--clean-first'];
    }
    const res = await run({ args, showCmd: log.verbose() });
    if (res.exitCode !== 0) {
        throw new Error('build failed.');
    }
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
