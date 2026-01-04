import type { NamedItem, Platform, RunOptions, RunResult, Schema, TargetType } from '../types.ts';
import { log } from './index.ts';
import { ensureDirSync } from '@std/fs';
import { dirname } from '@std/path';

/**
 * Find a named item in an array of named items by name.
 *
 * @param name name to search for
 * @param items array of named items
 * @returns found item or undefined
 */
export function find<T extends NamedItem>(name: string | undefined, items: T[]): T | undefined {
    if (name === undefined) {
        return undefined;
    }
    return items.find((elm) => elm.name === name);
}

/**
 * Find index of named item in an array of named items
 *
 * @param name name to search for
 * @param items array of named items
 * @returns index of found item or undefined
 */
export function findIndex<T extends NamedItem>(name: string, items: T[]): number | undefined {
    const index = items.findIndex((elm) => elm.name === name);
    return (index === -1) ? undefined : index;
}

/**
 * Add or replace a named item to/in an array of named items
 * @param items array of named item
 * @param item item to add or replace
 */
export function addOrReplace<T extends NamedItem>(items: T[], item: T) {
    const index = findIndex(item.name, items);
    if (index === undefined) {
        items.push(item);
    } else {
        items[index] = item;
    }
}

/**
 * Return a new array of named items without duplicates. When
 * there are multiple items of the same name, the last item 'wins'.
 *
 * @param items an array of named items.
 * @returns a new array without duplicates
 */
export function deduplicate<T extends NamedItem>(items: T[]): T[] {
    const res: T[] = [];
    for (const item of items) {
        addOrReplace(res, item);
    }
    return res;
}

/**
 * Checks if file and its directory hierarchy exists, and if not
 * creates a new empty text file.
 *
 * @param filePath path to file
 */
export function ensureFile(filePath: string) {
    if (!fileExists(filePath)) {
        ensureDirSync(dirname(filePath));
        Deno.writeTextFileSync(filePath, '');
    }
}

/**
 * Create directory if it doesn't exist (including subdirectories).
 *
 * @param path a directory path
 * @returns the same directory path
 */
export function ensureDir(path: string): string {
    ensureDirSync(path);
    return path;
}

/**
 * Return true if file exists (and is actually a file, not a directory).
 *
 * @param path a filesystem path
 * @returns true if path exists and is a file
 */
export function fileExists(path: string): boolean {
    try {
        const res = Deno.statSync(path);
        return res.isFile;
    } catch (_err) {
        return false;
    }
}

/**
 * Return true if directory exists (and is actually a directory).
 *
 * @param path a filesystem path
 * @returns true if path exists and is a directory
 */
export function dirExists(path: string): boolean {
    try {
        const res = Deno.statSync(path);
        return res.isDirectory;
    } catch (_err) {
        return false;
    }
}

/**
 * Returns path of '.fibs/' subdirectory given a project root directory.
 *
 * @param rootDir the project root directory
 * @returns path to the .fibs directory
 */
export function fibsDir(rootDir: string): string {
    return `${rootDir}/.fibs`;
}

/**
 * Returns path of '.fibs/sdks' subdirectory given the project root directory.
 *
 * @param rootDir the project root directory
 * @returns path to the '.fibs/sdks' subdirectory
 */
export function sdkDir(rootDir: string): string {
    return `${fibsDir(rootDir)}/sdks`;
}

/**
 * Returns path of the '.fibs/imports' subdirectory given the project root directory.
 *
 * @param rootDir the project root directory
 * @returns path to the '.fibs/imports' subdirectory
 */
export function importsDir(rootDir: string): string {
    return `${fibsDir(rootDir)}/imports`;
}

/**
 * Returns path of the '.fibs/config/[configName]' subdirectory given the
 * project root directory and configuration name. This is where
 * intermediate cmake config files live.
 *
 * @param rootDir the project root directory
 * @param configName name of a build config
 * @returns path to the '.fibs/config/[configName]' subdirectory
 */
export function configDir(rootDir: string, configName: string): string {
    return `${fibsDir(rootDir)}/config/${configName}`;
}

/**
 * Returns path of the '.fibs/build/[configName]' subdirectory given the
 * project root directory and configuration name. This is where
 * intermediate cmake build files live.
 *
 * @param rootDir the project root directory
 * @param configName name of a build config
 * @returns path to the '.fibs/build/[configName]' subdirectory
 */
export function buildDir(rootDir: string, configName: string): string {
    return `${fibsDir(rootDir)}/build/${configName}`;
}

/**
 * Returns path of the '.fibs/dist/[configName]' subdirectory given the
 * project root directory and configuration name. This is where the
 * compiled executables and asset files are located.
 *
 * @param rootDir the project root directory
 * @param configName name of a build config
 * @returns path to the '.fibs/dist/[configName]' subdirectory
 */
export function distDir(rootDir: string, configName: string): string {
    return `${fibsDir(rootDir)}/dist/${configName}`;
}

/**
 * Returns path of a target's build subdirectory given the project
 * root directory, a config name and a target name. This is where
 * the intermediate cmake build files for the target are located.
 *
 * @param rootDir the project root directory
 * @param configName name of a build config
 * @param targetName name of a target
 * @returns path to the '.fibs/build/[configName]/[targetName]' subdirectory
 */
export function targetBuildDir(rootDir: string, configName: string, targetName: string): string {
    return `${buildDir(rootDir, configName)}/${targetName}`;
}

/**
 * Returns path of a target's dist subdirectory given the project
 * root directory name, a config name and a target name. This is where
 * the target's executable file is located:
 *
 * - for windowed executables:
 *  - on macOS: .fibs/dist/[configName]/[targetName].app/Contents/MacOS
 *  - on iOS: .fibs/dist/[configName]/[targetName].app
 * - otherwise: .fibs/dist/[configName]
 *
 * @param rootDir the project root directory
 * @param configName a build config name
 * @param targetName a target name
 * @param platform the target platform
 * @param targetType the target type
 * @returns path to directory where the target executable is located
 */
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

/**
 * Returns path of a target's asset subdirectory given the project
 * root directory name, a build config name, a target name, the
 * target platform and target type.
 *
 * - for windowed executables:
 *  - on macOS: .fibs/dist/[configName]/[targetName].app/Contents/Resources
 *  - on iOS: .fibs/dist/[configName]/[targetName].app
 * - otherwise: .fibs/dist/[configName]
 *
 * @param rootDir the project root directory
 * @param configName a build config name
 * @param targetName a target name
 * @param platform the target platform
 * @param targetType the target type
 * @returns path to directory where the target's assets are located
 */
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
 * Helper function for target jobs which checks if output files are dirty,
 * returns true if (e.g. the job needs to run):
 *
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
 *
 * @param cmd the program to run
 * @param options a RunOptions object with options for running the command
 * @returns a RunResult object with exit code, and optional captured stdout/stderr
 */
export async function runCmd(cmd: string, options: RunOptions): Promise<RunResult> {
    const {
        showCmd = true,
        args,
        cwd,
        stdout = 'inherit',
        stderr = 'inherit',
        stdin = 'inherit',
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
        const command = new Deno.Command(cmdx, { args: argsx, stdout, stderr, stdin, cwd });
        const cmdRes = await command.output();
        const res: RunResult = {
            exitCode: cmdRes.code,
            stdout: (stdout === 'piped') ? new TextDecoder().decode(cmdRes.stdout) : '',
            stderr: (stderr === 'piped') ? new TextDecoder().decode(cmdRes.stderr) : '',
        };
        return res;
    } catch (err) {
        throw new Error(`Failed running '${cmd}'`, { cause: err });
    }
}

/**
 * Options for util.download()
 */
export type DownloadOptions = {
    /** a http or https url */
    url: string;
    /** the download directory (does not need to exist) */
    dir: string;
    /** the download filename */
    filename: string;
    /** whether to panic when the download fails */
    abortOnError?: boolean;
};

/**
 * Asynchronously download a file via http or https.
 *
 * @param options download options
 * @returns a Promise<boolean> which resolves to true when the download succeeds
 */
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
            ensureDirSync(dir);
            await using file = await Deno.open(path, { write: true, create: true });
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
            const msg = `Downloading ${url} failed with: ${response.status} (${response.statusText})`;
            if (abortOnError) {
                throw new Error(msg);
            } else {
                log.warn(msg);
                return false;
            }
        }
    } catch (err) {
        const msg = `Downloading ${url} to ${path} failed`;
        if (abortOnError) {
            throw new Error(msg, { cause: err });
        } else {
            log.warn(`${msg}, cause: `, err);
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
                        res.hints.push(`property '${key}' must be a number array`);
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
 * @param context - additional context log message when safe casting fails
 * @returns obj safely casted to type T
 */
export function safeCast<T>(obj: unknown, schema: Schema): T {
    const { valid, hints } = validate(obj, schema);
    if (!valid) {
        throw new Error(`safe casting failed:\n\n${hints.map((hint) => `  ${hint}`).join('\n')}`);
    }
    return obj as T;
}
