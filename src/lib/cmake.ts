import { host, log, util } from './index.ts';
import type { Compiler, Config, Project, RunOptions, RunResult } from '../types.ts';
import { CMakeMinimumRequired, genCMakeListsTxt, genCMakePresetsJson } from './generate.ts';
import { planJobs, validateJobs, writeJobFiles } from './jobs.ts';

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
file(WRITE cmake_config.json "{\\"CMAKE_C_COMPILER_ID\\":\\"\${CMAKE_C_COMPILER_ID}\\"}\\n")
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

// predefined macros of compilers which also pretend to be GCC or Clang
const otherCompilerMacros = ['__INTEL_COMPILER', '__INTEL_LLVM_COMPILER', '__NVCOMPILER', '__PGI'];

/**
 * Identify the C/C++ compiler of a build config, in order of preference:
 *
 * - the config's compiler hint (unless overridden via the CC environment variable)
 * - for host compilers: probe the compiler's predefined macros
 * - otherwise run a cmake configure 'pre-pass' on a dummy project, this
 *   is slow because it runs cmake's complete compiler detection
 *
 * The result of the last two options is cached in the config directory.
 *
 * @param project the Project object
 * @param config a build config
 * @returns a result object containing the identified compiler
 * @throws throw if cmake returns with an exit code !== 0
 */
export async function configure(project: Project, config: Config): Promise<{ compiler: Compiler }> {
    const probeable = isHostCompiler(config);
    // NOTE: the Xcode generator ignores CC and always uses Xcode's clang
    const envCC = (probeable && (config.generator !== 'xcode')) ? (config.environment.CC ?? Deno.env.get('CC')) : undefined;
    if ((config.compiler !== undefined) && (envCC === undefined)) {
        return { compiler: config.compiler };
    }
    const configDir = project.configDir(config.name);
    if (probeable) {
        const cc = envCC ?? 'cc';
        const probePath = `${configDir}/compiler.json`;
        if (util.fileExists(probePath)) {
            const cached = JSON.parse(Deno.readTextFileSync(probePath));
            if (cached.cc === cc) {
                return { compiler: cached.compiler };
            }
        }
        const compiler = await probeCompiler(cc);
        if (compiler !== 'unknown-compiler') {
            util.ensureDir(configDir);
            Deno.writeTextFileSync(probePath, JSON.stringify({ cc, compiler }));
            return { compiler };
        }
    }
    return { compiler: await runConfigurePrepass(project, config) };
}

// true if cmake will pick the compiler via the CC environment variable or the default 'cc'
function isHostCompiler(config: Config): boolean {
    if ((config.toolchainFile !== undefined) || (host.platform() === 'windows') || (config.generator === 'vstudio')) {
        return false;
    }
    // the compiler may also be selected via cmake cache variables
    return !config.cmakeCacheVariables.some((v) => (v.name === 'CMAKE_C_COMPILER') || (v.name === 'CMAKE_TOOLCHAIN_FILE'));
}

// identify a gcc-compatible compiler via its predefined macros
async function probeCompiler(cc: string): Promise<Compiler> {
    try {
        const res = await util.runCmd(cc, {
            args: ['-dM', '-E', '-x', 'c', '/dev/null'],
            stdout: 'piped',
            stderr: 'null',
            showCmd: log.verbose(),
        });
        if (res.exitCode === 0) {
            const defined = (macro: string) => new RegExp(`^#define ${macro} `, 'm').test(res.stdout);
            if (otherCompilerMacros.some(defined)) {
                return 'unknown-compiler';
            } else if (defined('__clang__')) {
                return defined('__apple_build_version__') ? 'appleclang' : 'clang';
            } else if (defined('__GNUC__')) {
                return 'gcc';
            }
        }
    } catch (_err) {
        // compiler not found
    }
    return 'unknown-compiler';
}

async function runConfigurePrepass(project: Project, config: Config): Promise<Compiler> {
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
    const configJson = JSON.parse(Deno.readTextFileSync(configPath));
    return fromCmakeCompiler(configJson.CMAKE_C_COMPILER_ID);
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
    const jobPlan = planJobs(project, config);
    validateJobs(project, config, jobPlan);
    writeJobFiles(project, jobPlan);
    try {
        Deno.writeTextFileSync(
            cmakeListsPath,
            genCMakeListsTxt(project, config, jobPlan),
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
export async function build(project: Project, config: Config, options: { target?: string; forceRebuild?: boolean, buildToolArgs?: string[] }) {
    const {
        target,
        forceRebuild = false,
        buildToolArgs,
    } = options;

    if (!util.fileExists(`${project.buildDir()}/CMakeCache.txt`)) {
        await generate(project, config);
    }
    // cmake + make with --parallel will heavily overcommit, so limit to available cores
    const parallelism = config.generator === 'make' ? navigator.hardwareConcurrency : undefined;

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
    if (buildToolArgs) {
        args = [...args, '--', ...buildToolArgs];
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
