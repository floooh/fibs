import { Config, NamedItem, Project, RunOptions, RunResult } from '../types.ts';
import { log } from './index.ts';
import { fs, path } from '../../deps.ts';

/**
 * Find a named item in an array of NamedItem-derived items.
 * @param name - the name to search for
 * @param items - an array of NamedItem-derived items
 * @returns found item, or undefined if not found
 */
export function find<T extends NamedItem>(name: string, items: T[]): T | undefined {
    return items.find((elm) => elm.name === name);
}

/**
 * Find index of a named item in an array of NamedItem-derived items.
 * @param name - the name to search for
 * @param items - an array of NamedItem-derived items
 * @returns index of found item, or undefined if not found
 */
export function findIndex<T extends NamedItem>(name: string, items: T[]): number | undefined {
    const index = items.findIndex((elm) => elm.name === name);
    return (index === -1) ? undefined : index;
}

/**
 * Searches for item with the same name in an array of named items.
 * If item exists, replace it, otherwise append it to the array.
 * @param items - array NamedItem-derived items
 * @param item - Named-item derived item to add or replace
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
 * Test if a path exists as file.
 * @param path absolute or cwd-relative path
 * @returns true if path exists and is a file, otherwise false
 */
export function fileExists(path: string): boolean {
    try {
        const res = Deno.statSync(path);
        return res.isFile;
    } catch (err) {
        return false;
    }
}

/**
 * Tests if a path exists as directory.
 * @param path absolute or cwd-relative path
 * @returns true if path exists and is a directory, otherwise false
 */
export function dirExists(path: string): boolean {
    try {
        const res = Deno.statSync(path);
        return res.isDirectory;
    } catch (err) {
        return false;
    }
}

/**
 * Ensures that a file and its directory exists. If not,
 * creates directory and an empty text file.
 * @param filePath absolute or cwd-relative file path
 */
export function ensureFile(filePath: string) {
    if (!fileExists(filePath)) {
        fs.ensureDirSync(path.dirname(filePath));
        Deno.writeTextFileSync(filePath, '');
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

/**
 * Ensures that the project's .fibs/ subdirectory exists and returns
 * its absolute path.
 * @param project - a valid Project object
 * @returns absolute path to project's .fibs/ subdirectory
 */
export function ensureFibsDir(project: Project): string {
    const path = project.fibsDir();
    fs.ensureDirSync(path);
    return path;
}

/**
 * Ensures that the dist directory for a project and build config exists
 * under `[project]/.fibs/dist/[config]` and returns its absolute path.
 * @param project - a valid Project object
 * @param configName - either a config name or undefined for the currently active config
 * @returns absolute path to dist directory
 */
export function ensureDistDir(project: Project, configName?: string): string {
    const path = project.distDir(configName);
    fs.ensureDirSync(path);
    return path;
}

/**
 * Ensures that the imports directory for a project exists
 * under `[project]/.fibs/imports/` and returns its absolute path.
 * @param project - a valid Project object
 * @returns absolute path to imports directory
 */
export function ensureImportsDir(project: Project): string {
    const path = project.importsDir();
    fs.ensureDirSync(path);
    return path;
}

/**
 * Returns true if the provided build config is compatible with
 * the provided platform (cross-compilation configs are always valid).
 * @param config - a valid Config object
 * @param platform - a platform name
 * @returns true if config is compatible with platform
 */
export function validConfigForPlatform(config: Config, platform: string): boolean {
    // cross-compilation configs are valid on all platforms
    // FIXME: how to deal with cmake's integrated cross-platform support
    // which doesn't need a toolchain file?
    if (config.toolchainFile) {
        return true;
    }
    return config.platform === platform;
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
        stdout,
        stderr,
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
        const { code: exitCode, stdout: cmdStdout, stderr: cmdStderr } = await command.output();
        const res: RunResult = {
            exitCode,
            stdout: (stdout === 'piped') ? new TextDecoder().decode(cmdStdout) : '',
            stderr: (stderr === 'piped') ? new TextDecoder().decode(cmdStderr) : '',
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
 * Returns true if 'val' is a (potentially empty) string and coerce to string.
 * @param val - an object of unknown type
 * @returns true if val is a string
 */
export function isString(val: unknown): val is string {
    return typeof val === 'string';
}

/**
 * Returns true if 'val' is a Number and coerce to Number.
 * @param val - an object of unknown type
 * @returns true if val is a number
 */
export function isNumber(val: unknown): val is Number {
    return typeof val === 'number';
}

/**
 * Returns true if 'val' is a boolean and coerce to boolean.
 * @param val - an object of unknown type
 * @returns true if val is a boolean
 */
export function isBoolean(val: unknown): val is boolean {
    return typeof val === 'boolean';
}

/**
 * Returns true if 'val' is a string array and coerces to a string array.
 * @param val - an object of unknown type
 * @returns true if val is a string array
 */
export function isStringArray(val: unknown): val is string[] {
    return Array.isArray(val) && val.every((item) => isString(item));
}

/**
 * Returns true if 'val' is a Number array and coerces to a number array
 * @param val - an object of unknown type
 * @returns true if val is a Number array
 */
export function isNumberArray(val: unknown): val is Number[] {
    return Array.isArray(val) && val.every((item) => isNumber(item));
}

/**
 * Returns true if 'val' is a boolean array and coerves to a boolean array.
 * @param val - an object of unknown type
 * @returns trye if val is a boolean array
 */
export function isBooleanArray(val: unknown): val is boolean[] {
    return Array.isArray(val) && val.every((item) => isBoolean(item));
}

/**
 * Iterates over the properties of an 'args' object and checks their
 * type against a map of expected argument types.
 * @param args - an object with properties to check
 * @param expected - a map of property names and their expected type
 * @returns validation result (either valid, or a string array with hints what's wrong)
 */
export function validateArgs(
    args: object,
    expected: Record<
        string,
        { type: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]' | 'boolean[]'; optional: boolean }
    >,
): { valid: boolean; hints: string[] } {
    const res: ReturnType<typeof validateArgs> = { valid: true, hints: [] };
    for (const [key, value] of Object.entries(expected)) {
        if (!value.optional && (args[key as keyof object] === undefined)) {
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
