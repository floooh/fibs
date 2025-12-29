import type { NamedItem, Platform, RunOptions, RunResult, Schema, TargetType } from '../types.ts';
import { log } from './index.ts';
import { ensureDirSync } from '@std/fs';
import { dirname } from '@std/path';

export function find<T extends NamedItem>(name: string | undefined, items: T[]): T | undefined {
    if (name === undefined) {
        return undefined;
    }
    return items.find((elm) => elm.name === name);
}

export function findIndex<T extends NamedItem>(name: string, items: T[]): number | undefined {
    const index = items.findIndex((elm) => elm.name === name);
    return (index === -1) ? undefined : index;
}

export function ensureFile(filePath: string) {
    if (!fileExists(filePath)) {
        ensureDirSync(dirname(filePath));
        Deno.writeTextFileSync(filePath, '');
    }
}

export function ensureDir(path: string): string {
    ensureDirSync(path);
    return path;
}

export function fileExists(path: string): boolean {
    try {
        const res = Deno.statSync(path);
        return res.isFile;
    } catch (_err) {
        return false;
    }
}

export function dirExists(path: string): boolean {
    try {
        const res = Deno.statSync(path);
        return res.isDirectory;
    } catch (_err) {
        return false;
    }
}

export function fibsDir(rootDir: string): string {
    return `${rootDir}/.fibs`;
}

export function sdkDir(rootDir: string): string {
    return `${fibsDir(rootDir)}/sdks`;
}

export function importsDir(rootDir: string): string {
    return `${fibsDir(rootDir)}/imports`;
}

export function configDir(rootDir: string, configName: string): string {
    return `${fibsDir(rootDir)}/config/${configName}`;
}

export function buildDir(rootDir: string, configName: string): string {
    return `${fibsDir(rootDir)}/build/${configName}`;
}

export function distDir(rootDir: string, configName: string): string {
    return `${fibsDir(rootDir)}/dist/${configName}`;
}

export function targetBuildDir(rootDir: string, configName: string, targetName: string): string {
    return `${buildDir(rootDir, configName)}/${targetName}`;
}

export function targetDistDir(
    rootDir: string,
    configName: string,
    targetName: string,
    platform: Platform,
    targetType: TargetType,
): string {
    if (platform === 'macos' && targetType === 'windowed-exe') {
        return `${distDir(rootDir, configName)}/${targetName}.app/Contents/MacOS`;
    } else if (platform === 'ios' && targetType === 'windowed-exe') {
        return `${distDir(rootDir, configName)}/${targetName}.app`;
    } else {
        return distDir(rootDir, configName);
    }
}

export function targetAssetsDir(
    rootDir: string,
    configName: string,
    targetName: string,
    platform: Platform,
    targetType: TargetType,
): string {
    if (platform === 'macos' && targetType === 'windowed-exe') {
        return `${distDir(rootDir, configName)}/${targetName}.app/Contents/Resources`;
    } else if (platform === 'ios' && targetType === 'windowed-exe') {
        return `${distDir(rootDir, configName)}/${targetName}.app`;
    } else {
        return distDir(rootDir, configName);
    }
}

/**
 * Checks if output files are dirty, returns true if:
 * - any of the input or output files don't exist
 * - any of the output files exist but have size 0 (this is necessary because
 *   fibs may need to create empty output files before cmake runs, if those
 *   output files are input source files)
 * - any of the input files has a more recent modification date than
 *   any of the output files
 *
 * @param inputs - an array of input file paths
 * @param outputs - an array of output file paths
 * @returns true if outputs need to be regenerated
 * @throws throws error when input file is missing
 */
export function dirty(inputs: string[], outputs: string[]): boolean {
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
        } catch (_err) {
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

/**
 * Run a program with optional logging of the command line and support for
 * capturing stdout/stderr.
 * @param cmd - the program to run
 * @param options - a RunOptions object with options for running the command
 * @returns a RunResult object with exit code, and optional captured stdout/stderr
 */
export async function runCmd(cmd: string, options: RunOptions): Promise<RunResult> {
    const {
        showCmd = true,
        abortOnError = true,
        args,
        cwd,
        stdout = 'inherit',
        stderr = 'inherit',
        winUseCmd,
    } = options;
    let cmdx;
    let argsx;
    if ((Deno.build.os === 'windows') && winUseCmd) {
        cmdx = 'cmd';
        argsx = ['/c', cmd, ...args];
    } else {
        cmdx = cmd;
        argsx = args;
    }
    if (showCmd) {
        log.run([cmdx, ...argsx], cwd);
    }
    try {
        const command = new Deno.Command(cmdx, { args: argsx, stdout, stderr, cwd });
        const cmdRes = await command.output();
        const res: RunResult = {
            exitCode: cmdRes.code,
            stdout: (stdout === 'piped') ? new TextDecoder().decode(cmdRes.stdout) : '',
            stderr: (stderr === 'piped') ? new TextDecoder().decode(cmdRes.stderr) : '',
        };
        return res;
    } catch (err) {
        if (abortOnError) {
            log.panic(`Failed running '${cmd}' with: `, err);
        } else {
            throw err;
        }
    }
}

/**
 * Download a file via http or https.
 * @param options - download options
 * @param options.url - the URL to download from
 * @param options.dir - the directory to place the downloaded file (created on demand)
 * @param options.filename - the filename for the downloaded file
 * @param options.abortOnError - whether to abort on an error (default is true)
 * @returns true if download succeeded
 */
export async function download(
    options: { url: string; dir: string; filename: string; abortOnError?: boolean },
): Promise<boolean> {
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
            ensureDirSync(dir);
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
                log.panic(msg);
            } else {
                log.warn(msg);
                return false;
            }
        }
    } catch (err) {
        const msg = `Downloading '${url} to ${path} failed with: `;
        if (abortOnError) {
            log.panic(msg, err);
        } else {
            log.warn(msg, err);
            return false;
        }
    }
    return true;
}

/**
 * Validate JS object against schema.
 *
 * @param obj a JS object of type unknown
 * @param schema a Schema object
 */
export function validate(obj: unknown, schema: Schema): { valid: boolean; hints: string[] } {
    const res: ReturnType<typeof validate> = { valid: false, hints: [] };
    if (typeof obj !== 'object') {
        res.hints.push('object must be a record');
        return res;
    }
    if (obj === null) {
        res.hints.push('object must not be null');
        return res;
    }
    for (const [key, val] of Object.entries(schema)) {
        if (!val.optional && obj[key as keyof object] === undefined) {
            res.hints.push(`required arg '${key}' is missing`);
        }
    }
    for (const [key, val] of Object.entries(obj)) {
        const schemaItem = schema[key];
        if (schemaItem === undefined) {
            res.hints.push(`unknown property '${key}'`);
        } else {
            switch (schemaItem.type) {
                case 'string':
                    if (typeof val !== 'string') {
                        res.hints.push(`property '${key}' must be a string`);
                    }
                    break;
                case 'number':
                    if (typeof val !== 'number') {
                        res.hints.push(`property '${key}' must be a number`);
                    }
                    break;
                case 'boolean':
                    if (typeof val !== 'boolean') {
                        res.hints.push(`property '${key}' must be a boolean`);
                    }
                    break;
                case 'enum':
                    if (typeof val !== 'string' || !schemaItem.items.includes(val)) {
                        res.hints.push(`property '${key}' must be one of [${schemaItem.items.join(' ')}]`);
                    }
                    break;
                case 'string[]':
                    if (!Array.isArray(val) || !val.every((item) => typeof item === 'string')) {
                        res.hints.push(`property '${key}' must be a string array`);
                    }
                    break;
                case 'number[]':
                    if (!Array.isArray(val) || !val.every((item) => typeof item === 'number')) {
                        res.hints.push(`property '${key}' must a number array`);
                    }
                    break;
                case 'boolean[]':
                    if (!Array.isArray(val) || !val.every((item) => typeof item === 'boolean')) {
                        res.hints.push(`property '${key}' must be a boolean array`);
                    }
                    break;
                case 'object':
                    {
                        const { hints } = validate(val, schemaItem.schema);
                        res.hints.push(...hints);
                    }
                    break;
            }
        }
    }
    res.valid = res.hints.length === 0;
    return res;
}

/**
 * Safely cast an unknown object to a type with schema validation.
 *
 * @param obj - an object to cast
 * @param schema - a schema to validate obj against
 * @returns obj safely casted to type T
 */
export function safeCast<T>(obj: unknown, schema: Schema, silent: boolean = false): T {
    const { valid, hints } = validate(obj, schema);
    if (!valid && !silent) {
        log.panic(`safe casting failed:\n${hints.forEach((hint) => `  ${hint}\n`)}`);
    }
    return obj as T;
}
