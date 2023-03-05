import { Config, Platform, Project, RunOptions, RunResult } from './types.ts';
import * as log from './log.ts';
import { fs } from '../deps.ts';

export function fileExists(path: string): boolean {
    try {
        const res = Deno.statSync(path);
        return res.isFile;
    } catch (err) {
        return false;
    }
}

export function dirExists(path: string): boolean {
    try {
        const res = Deno.statSync(path);
        return res.isDirectory;
    } catch (err) {
        return false;
    }
}

/**
 * Checks if any of the inputs is newer than any all of the outputs,
 * also returns true if any input or output doesn't exist.
 * @param inputs an array of file paths defining inputs
 * @param outputs an array of file paths defining outputs
 * @returns true if outputs are dirty
 */
export function isDirty(inputs: string[], outputs: string[]) {
    let mtime: number = 0;

    // first find the newest output modification time
    for (const path of outputs) {
        try {
            const res = Deno.statSync(path);
            if (res.mtime === null) {
                return true;
            } else if (res.mtime.getTime() > mtime) {
                mtime = res.mtime.getTime();
            }
        } catch (err) {
            return true;
        }
    }
    // now check against inputs
    for (const path of inputs) {
        try {
            const res = Deno.statSync(path);
            if (res.mtime === null) {
                return true;
            } else if (res.mtime.getTime() > mtime) {
                return true;
            }
        } catch (err) {
            return true;
        }
    }
    return false;
}

export function fibsDir(project: Project): string {
    return `${project.dir}/.fibs`;
}

export function ensureFibsDir(project: Project): string {
    const path = fibsDir(project);
    fs.ensureDirSync(path);
    return path;
}

export function buildDir(project: Project, config: Config): string {
    return `${fibsDir(project)}/build/${config.name}`;
}

export function ensureBuildDir(project: Project, config: Config): string {
    const path = buildDir(project, config);
    fs.ensureDirSync(path);
    return path;
}

export function distDir(project: Project, config: Config): string {
    return `${fibsDir(project)}/dist/${config.name}`;
}

export function ensureDistDir(project: Project, config: Config): string {
    const path = distDir(project, config);
    fs.ensureDirSync(path);
    return path;
}

export function defaultConfigForPlatform(platform: Platform): string {
    switch (platform) {
        case 'windows':
            return 'win-vstudio-release';
        case 'macos':
            return 'macos-make-release';
        case 'ios':
            return 'ios-xcode-release';
        case 'linux':
            return 'linux-make-release';
        case 'android':
            return 'android-make-release';
        case 'emscripten':
            return 'emscripten-make-release';
        case 'wasi':
            return 'wasi-make-release';
    }
}

export function activeConfig(project: Project): Config {
    const name = project.settings.config.value;
    const config = project.configs[name];
    if (config === undefined) {
        log.error(`active config ${name} does not exist`);
    }
    return config;
}

export function validConfigForPlatform(config: Config, platform: Platform): boolean {
    // cross-compilation configs are valid on all platforms
    if (config.toolchainFile) {
        return true;
    }
    return config.platform === platform;
}

export async function runCmd(cmd: string, options: RunOptions): Promise<RunResult> {
    const cmdLine = [cmd, ...options.args];
    const showCmd = options.showCmd ?? true;
    const abortOnError = options.abortOnError ?? true;
    if (showCmd) {
        log.run(cmdLine);
    }
    try {
        const p = Deno.run({
            cmd: cmdLine,
            cwd: options.cwd,
            stdout: options.stdout,
            stderr: options.stderr,
        });
        const res: RunResult = {
            exitCode: (await p.status()).code,
            stdout: (options.stdout === 'piped') ? new TextDecoder().decode(await p.output()) : '',
            stderr: (options.stderr === 'piped') ? new TextDecoder().decode(await p.stderrOutput()) : '',
        };
        return res;
    } catch (err) {
        if (abortOnError === true) {
            log.error(`Failed running '${cmd}' with: ${err.message}`);
        } else {
            throw err;
        }
    }
}
