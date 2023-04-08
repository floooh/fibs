import { Config, Platform, Project, RunOptions, RunResult, Target } from './types.ts';
import * as log from './log.ts';
import { fs, path } from '../deps.ts';

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

export function ensureFile(filePath: string) {
    if (!fileExists(filePath)) {
        fs.ensureDirSync(path.dirname(filePath));
        Deno.writeTextFileSync(filePath, '');
    }
}

/**
 * Checks if outputs are dirty, returns true if:
 * - any of the input or output files don't exist
 * - any of the output files exist but have size 0 (this is necessary because
 *   fibs may need to create empty output files before cmake runs, if those
 *   output files are input source files)
 * - any of the input files has a more recent modification date than
 *   any of the output files
 *
 * @param inputs an array of input file paths
 * @param outputs an array of output file paths
 * @returns true if outputs need to be regenerated
 * @throws throws error when input file is missing
 */
export function dirty(inputs: string[], outputs: string[]) {
    let mtime: number = 0;

    // first gather input stats and throw if any of the inputs doesn't exist
    const inputStats = inputs.map((input) => Deno.statSync(input));

    // check if outputs exists, and get their most recent modification time
    for (const path of outputs) {
        try {
            const res = Deno.statSync(path);
            if (res.mtime === null) {
                return true;
            } else if (res.size === 0) {
                return true;
            } else if (res.mtime.getTime() > mtime) {
                mtime = res.mtime.getTime();
            }
        } catch (err) {
            // output file doesn't exist
            return true;
        }
    }

    // check inputs
    for (const inputStat of inputStats) {
        if (inputStat.mtime === null) {
            return true;
        } else if (inputStat.mtime.getTime() > mtime) {
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

export function sdkDir(project: Project): string {
    return `${fibsDir(project)}/sdks`;
}

export function ensureSdkDir(project: Project): string {
    const path = sdkDir(project);
    fs.ensureDirSync(path);
    return path;
}

export function importsDir(project: Project): string {
    return `${fibsDir(project)}/imports`;
}

export function ensureImportsDir(project: Project): string {
    const path = importsDir(project);
    fs.ensureDirSync(path);
    return path;
}

export function targetBuildDir(project: Project, config: Config, target: Target): string {
    return `${buildDir(project, config)}/${target.name}`;
}

export function ensureTargetBuildDir(project: Project, config: Config, target: Target): string {
    const path = targetBuildDir(project, config, target);
    fs.ensureDirSync(path);
    return path;
}

export function targetDistDir(project: Project, config: Config, target: Target): string {
    // FIXME: Android
    if (config.platform === 'macos' && target.type === 'windowed-exe') {
        return `${distDir(project, config)}/${target.name}.app/Contents/MacOS`;
    } else if (config.platform === 'ios' && target.type === 'windowed-exe') {
        return `${distDir(project, config)}/${target.name}.app`;
    } else {
        return distDir(project, config);
    }
}

export function ensureTargetDistDir(project: Project, config: Config, target: Target): string {
    const path = targetDistDir(project, config, target);
    fs.ensureDirSync(path);
    return path;
}

export function targetAssetsDir(project: Project, config: Config, target: Target): string {
    if (config.platform === 'macos' && target.type === 'windowed-exe') {
        return `${distDir(project, config)}/${target.name}.app/Contents/Resources`;
    } else if (config.platform === 'ios' && target.type === 'windowed-exe') {
        return `${distDir(project, config)}/${target.name}.app`;
    } else {
        return distDir(project, config);
    }
}

export function ensureTargetAssetsDir(project: Project, config: Config, target: Target): string {
    const path = targetAssetsDir(project, config, target);
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

export type BuildAliasMapOptions = {
    project: Project,
    config: Config,
    target?: Target,
    selfDir?: string,
}

export function buildAliasMap(options: BuildAliasMapOptions): Record<string, string> {
    const { project, config, target, selfDir } = options;
    const res: Record<string, string> = {
        '@root:': project.dir,
        '@sdks:': sdkDir(project),
        '@build:': buildDir(project, config),
        '@dist:': distDir(project, config),
        '@imports:': importsDir(project),
    };
    if (selfDir !== undefined) {
        res['@self:'] = selfDir;
    }
    if (target !== undefined) {
        res['@targetsources:'] = resolvePathNoAlias(target.importDir, target.dir);
        res['@targetbuild:'] = targetBuildDir(project, config, target);
        res['@targetdist:'] = targetDistDir(project, config, target);
        res['@targetassets:'] = targetAssetsDir(project, config, target);
    }
    return res;
}

export function resolveAlias(aliasMap: Record<string, string>, str: string): string {
    if ((str !== undefined) && str.startsWith('@')) {
        for (const k in aliasMap) {
            if (str.startsWith(k)) {
                return str.replace(k, `${aliasMap[k]}/`).replace('//', '/');
            }
        }
        log.error(`cannot resolve alias in '${str}`);
    }
    return str;
}

export function resolvePathNoAlias(...items: (string | undefined)[]): string {
    return items.filter((item) => item !== undefined).join('/');
}

export function resolvePath(aliasMap: Record<string, string>, ...items: (string | undefined)[]): string {
    return resolveAlias(aliasMap, resolvePathNoAlias(...items));
}

export async function runCmd(cmd: string, options: RunOptions): Promise<RunResult> {
    const {
        showCmd = true,
        abortOnError = true,
        args,
        cwd,
        stdout,
        stderr,
        winUseCmd,
    } = options;
    let cmdLine;
    if ((Deno.build.os === 'windows') && winUseCmd) {
        cmdLine = ['cmd', '/c', cmd, ...args];
    } else {
        cmdLine = [cmd, ...args];
    }
    if (showCmd) {
        log.run(cmdLine);
    }
    try {
        const p = Deno.run({
            cmd: cmdLine,
            cwd: cwd,
            stdout: stdout,
            stderr: stderr,
        });
        const res: RunResult = {
            exitCode: (await p.status()).code,
            stdout: (stdout === 'piped') ? new TextDecoder().decode(await p.output()) : '',
            stderr: (stderr === 'piped') ? new TextDecoder().decode(await p.stderrOutput()) : '',
        };
        return res;
    } catch (err) {
        if (abortOnError) {
            log.error(`Failed running '${cmd}' with: ${err.message}`);
        } else {
            throw err;
        }
    }
}

export type DownloadOptions = {
    url: string;
    dir: string;
    filename: string;
    abortOnError?: boolean;
};

export async function download(options: DownloadOptions): Promise<boolean> {
    const {
        url,
        dir,
        filename,
        abortOnError = true,
    } = options;
    const path = `${dir}/${filename}`;
    try {
        const response = await fetch(url);
        if ((response.status < 400) && response.body) {
            const allLength = +response.headers.get('Content-Length')!;
            let curLength = 0;
            fs.ensureDirSync(dir);
            const file = await Deno.open(path, { write: true, create: true });
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                curLength += value.length;
                const percent = Math.round((curLength / allLength) * 10000) / 100;
                log.write(`${percent}%\r`);
                await file.write(value);
            }
        } else {
            const msg = `Downloading '${url} failed with: ${response.status} (${response.statusText})`;
            if (abortOnError) {
                log.error(msg);
            } else {
                log.warn(msg);
                return false;
            }
        }
    } catch (err) {
        const msg = `Downloading '${url} to ${path} failed with: ${err.message}`;
        if (abortOnError) {
            log.error(msg);
        } else {
            log.warn(msg);
            return false;
        }
    }
    return true;
}

export function isString(val: unknown): boolean {
    return typeof val === 'string';
}

export function isNumber(val: unknown): boolean {
    return typeof val === 'number';
}

export function isBoolean(val: unknown): boolean {
    return typeof val === 'boolean';
}

export function isStringArray(val: unknown): boolean {
    return Array.isArray(val) && val.every((item) => isString(item));
}

export function isNumberArray(val: unknown): boolean {
    return Array.isArray(val) && val.every((item) => isNumber(item));
}

export function isBooleanArray(val: unknown): boolean {
    return Array.isArray(val) && val.every((item) => isBoolean(item));
}

export type ArgDesc = {
    type: 'string'|'number'|'boolean'|'string[]'|'number[]'|'boolean[]';
    optional: boolean;
}

export type ValidateArgsResult = {
    valid: boolean;
    hints: string[];
};

export function validateArgs(args: any, expected: Record<string, ArgDesc>): ValidateArgsResult {
    const res: ValidateArgsResult = { valid: true, hints: [] };
    for (const [key, value] of Object.entries(expected)) {
        if (!value.optional && (args[key] === undefined)) {
            res.valid = false;
            res.hints.push(`expected required arg '${key}'`);
        }
    }
    for (const [key, value] of Object.entries(args)) {
        const exp = expected[key];
        if (exp === undefined) {
            res.valid = false;
            res.hints.push(`unknown arg '${key}'`);
        } else {
            switch (exp.type) {
                case 'boolean':
                    if (!isBoolean(value)) {
                        res.valid = false;
                        res.hints.push(`arg '${key} must be a boolean`);
                    }
                    break;
                case 'boolean[]':
                    if (!isBooleanArray(value)) {
                        res.valid = false;
                        res.hints.push(`arg '${key} must be a boolean array`);
                    }
                case 'number':
                    if (!isNumber(value)) {
                        res.valid = false;
                        res.hints.push(`arg '${key} must be a number`);
                    }
                    break;
                case 'number[]':
                    if (!isNumberArray(value)) {
                        res.valid = false;
                        res.hints.push(`arg '${key} must be a number array`);
                    }
                    break;
                case 'string':
                    if (!isString(value)) {
                        res.valid = false;
                        res.hints.push(`arg '${key} must be a string`);
                    }
                    break;
                case 'string[]':
                    if (!isStringArray(value)) {
                        res.valid = false;
                        res.hints.push(`arg '${key} must be a string array`);
                    }
                    break;
            }
        }
    }
    return res;
}
