import { Config, NamedItem, Project, RunOptions, RunResult, Target } from './types.ts';
import * as log from './log.ts';
import * as fs from '@std/fs';
import * as path from '@std/path';

/**
 * Find a named item in an array of NamedItem-derived items.
 * @param name - the name to search for
 * @param items - an array of NamedItem-derived items
 * @returns found item, or undefined if not found
 */
export function find<T extends NamedItem>(name: string | undefined, items: T[] | undefined): T | undefined {
    if ((name === undefined) || (items === undefined)) {
        return undefined;
    }
    return items.find((elm) => elm.name === name);
}

/**
 * Find index of a named item in an array of NamedItem-derived items.
 * @param name - the name to search for
 * @param items - an array of NamedItem-derived items
 * @returns index of found item, or undefined if not found
 */
export function findIndex<T extends NamedItem>(name: string | undefined, items: T[] | undefined): number | undefined {
    if ((name === undefined) || (items === undefined)) {
        return undefined;
    }
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
 * Returns absolute path to the project's .fibs/ subdirectory directory.
 * @param project - a valid Project object
 * @returns absolute path to project's .fibs/ subdirectory
 */
export function fibsDir(project: Project): string {
    return `${project.dir}/.fibs`;
}

/**
 * Ensures that the project's .fibs/ subdirectory exists and returns
 * its absolute path.
 * @param project - a valid Project object
 * @returns absolute path to project's .fibs/ subdirectory
 */
export function ensureFibsDir(project: Project): string {
    const path = fibsDir(project);
    fs.ensureDirSync(path);
    return path;
}

/**
 * Returns absolute path to the build directory for a project
 * and build config: `[project]/.fibs/build/[config]/`
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @returns absolute path to build directory
 */
export function buildDir(project: Project, config: Config): string {
    return `${fibsDir(project)}/build/${config.name}`;
}

/**
 * Ensures that the build directory for a project and build config exists
 * under `[project]/.fibs/build/[config]` and returns its absolute path.
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @returns absolute path to build directory
 */
export function ensureBuildDir(project: Project, config: Config): string {
    const path = buildDir(project, config);
    fs.ensureDirSync(path);
    return path;
}

/**
 * Returns absolute path to the dist directory for a project and build
 * config: `[project]/.fibs/dist/[config]/`
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @returns absolute path to dist directory
 */
export function distDir(project: Project, config: Config): string {
    return `${fibsDir(project)}/dist/${config.name}`;
}

/**
 * Ensures that the dist directory for a project and build config exists
 * under `[project]/.fibs/dist/[config]` and returns its absolute path.
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @returns absolute path to dist directory
 */
export function ensureDistDir(project: Project, config: Config): string {
    const path = distDir(project, config);
    fs.ensureDirSync(path);
    return path;
}

/**
 * Returns absolute path to the sdks directory for a project:
 * `[project]/.fibs/sdks/`
 * @param project - a valid Project object
 * @returns absolute path to sdks directory
 */
export function sdkDir(project: Project): string {
    return `${fibsDir(project)}/sdks`;
}

/**
 * Ensures that the sdks directory for a project exists
 * under `[project]/.fibs/sdks/` and returns its absolute path.
 * @param project - a valid Project object
 * @returns absolute path to sdks directory
 */
export function ensureSdkDir(project: Project): string {
    const path = sdkDir(project);
    fs.ensureDirSync(path);
    return path;
}

/**
 * Returns absolute path to the imports directory for a project:
 * `[project]/.fibs/imports/`.
 * @param project - a valid Project object
 * @returns absolute path to imports directory
 */
export function importsDir(project: Project): string {
    return `${fibsDir(project)}/imports`;
}

/**
 * Ensures that the imports directory for a project exists
 * under `[project]/.fibs/imports/` and returns its absolute path.
 * @param project - a valid Project object
 * @returns absolute path to imports directory
 */
export function ensureImportsDir(project: Project): string {
    const path = importsDir(project);
    fs.ensureDirSync(path);
    return path;
}

/**
 * Returns absolute path to a build target's build directory
 * under `[project]/.fibs/build/[config]/[target]`.
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @param target - a valid Target object
 * @returns absolute path to the target's build directory
 */
export function targetBuildDir(project: Project, config: Config, target: Target): string {
    return `${buildDir(project, config)}/${target.name}`;
}

/**
 * Ensures that a build target's build directory exists under
 * `[project]/.fibs/build/[config]/[target] and returns its
 * absolute path.
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @param target - a valid Target object
 * @returns absolute path to the target's build directory
 */
export function ensureTargetBuildDir(project: Project, config: Config, target: Target): string {
    const path = targetBuildDir(project, config, target);
    fs.ensureDirSync(path);
    return path;
}

/**
 * Returns absolute path to a build target's dist directory (where the
 * executable resides), this may have platform-specific subdirectories.
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @param target - a valid Target object
 * @returns absolute path to the target's dist directory
 */
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

/**
 * Ensures that a build target's dist directory exists (where the executable
 * resides), and returns its absolute path.
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @param target - a valid Target object
 * @returns absolute path to the target's dist directory
 */
export function ensureTargetDistDir(project: Project, config: Config, target: Target): string {
    const path = targetDistDir(project, config, target);
    fs.ensureDirSync(path);
    return path;
}

/**
 * Returns absolute path to a build target's asset directory. Depending on platform
 * this may be different from the target's dist directory.
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @param target - a valid Target object
 * @returns absolute path to the target's asset directory
 */
export function targetAssetsDir(project: Project, config: Config, target: Target): string {
    if (config.platform === 'macos' && target.type === 'windowed-exe') {
        return `${distDir(project, config)}/${target.name}.app/Contents/Resources`;
    } else if (config.platform === 'ios' && target.type === 'windowed-exe') {
        return `${distDir(project, config)}/${target.name}.app`;
    } else {
        return distDir(project, config);
    }
}

/**
 * Ensures that a build target's asset directory exists and returns its absolute path.
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @param target - a valid Target object
 * @returns absolute path to the target's asset directory
 */
export function ensureTargetAssetsDir(project: Project, config: Config, target: Target): string {
    const path = targetAssetsDir(project, config, target);
    fs.ensureDirSync(path);
    return path;
}

/**
 * Returns the currently active build config of a project.
 * @param project - a valid Project object
 * @returns Config object of the currently active build config
 */
export function activeConfig(project: Project): Config {
    const name = project.settings.config.value;
    const config = find(name, project.configs);
    if (config === undefined) {
        log.panic(`active config ${name} does not exist`);
    }
    return config;
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

function buildAliasMap(options: { project: Project; config: Config; target?: Target; selfDir?: string }): Record<string, string> {
    const { project, config, target, selfDir } = options;
    let res: Record<string, string> = {
        '@root:': project.dir,
        '@sdks:': sdkDir(project),
        '@build:': buildDir(project, config),
        '@dist:': distDir(project, config),
        '@imports:': importsDir(project),
    };
    if (selfDir !== undefined) {
        res = {
            ...res,
            '@self:': selfDir,
        };
    }
    if (target !== undefined) {
        res = {
            ...res,
            '@targetsources:': resolvePathNoAlias(target.importDir, target.dir),
            '@targetbuild:': targetBuildDir(project, config, target),
            '@targetdist:': targetDistDir(project, config, target),
            '@targetassets:': targetAssetsDir(project, config, target),
        };
    }
    return res;
}

/**
 * Builds a path-alias map for a project and config, mapping the following path
 * aliases to an absolute filesystem path:
 *
 * - `@root:` points to the project's root directory
 * - `@self:` same as `@root`
 * - `@sdks:` points to the project's `.fibs/sdks` subdirectory
 * - `@build:` points to the `.fibs/build/[config]` subdirectory
 * - `@dist:` points to the project's `.fibs/dist/[config]` subdirectory
 * - `@imports:` points to the project's `.fibs/imports` subdirectory
 *
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @returns a path-alias map with absolute paths as described above
 */
export function buildProjectAliasMap(project: Project, config: Config): Record<string, string> {
    return buildAliasMap({ project, config, selfDir: project.dir });
}

/**
 * Builds a path-alias map for a project and config, with `@self` pointing to the
 * import directory of the build config. This is useful for imports that define
 * their own build configs, and where the configs need to reference files in the
 * import directory.
 *
 * The result contains the following aliases:
 *
 * - `@root:` points to the project's root directory
 * - `@self:` points to the config's import directory
 * - `@sdks:` points to the project's `.fibs/sdks` subdirectory
 * - `@build:` points to the `.fibs/build/[config]` subdirectory
 * - `@dist:` points to the project's `.fibs/dist/[config]` subdirectory
 * - `@imports:` points to the project's `.fibs/imports` subdirectory
 *
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @returns a path-alias map with absolute paths as described above
 */
export function buildConfigAliasMap(project: Project, config: Config): Record<string, string> {
    return buildAliasMap({ project, config, selfDir: config.importDir });
}

/**
 * Builds a path-alias map for a project, config and build target. The `@self` alias
 * points to the target's import directory, and there are additional target-specific
 * aliases:
 *
 * - `@root:` points to the project's root directory
 * - `@self:` points to the target's import directory
 * - `@sdks:` points to the project's `.fibs/sdks` subdirectory
 * - `@build:` points to the `.fibs/build/[config]` subdirectory
 * - `@dist:` points to the project's `.fibs/dist/[config]` subdirectory
 * - `@imports:` points to the project's `.fibs/imports` subdirectory
 * - `@targetsources`: points to the target's source code root directory
 * - `@targetbuild`: points to the target's intermediate build directory
 * - `@targetdist`: points to the target's dist directory (where the executable resides)
 * - `@targetassets`: points to the target's asset directory
 *
 * @param project - a valid Project object
 * @param config - a valid Config object
 * @param target - a valid Target object
 * @returns a path-alias map with absolute paths as described above
 */
export function buildTargetAliasMap(project: Project, config: Config, target: Target): Record<string, string> {
    return buildAliasMap({ project, config, target, selfDir: target.importDir });
}

/**
 * If string starts with a path alias ('@'), resolve the string into an absolute
 * path, otherwise return original string.
 *
 * @param aliasMap - a path-alias map which maps '@' aliases to absolute paths
 * @param str - a string that may start with a path alias '@'
 * @returns a string with path-aliases resolved
 */
export function resolveAlias(aliasMap: Record<string, string>, str: string): string {
    if ((str !== undefined) && str.startsWith('@')) {
        for (const k in aliasMap) {
            if (str.startsWith(k)) {
                return str.replace(k, `${aliasMap[k]}/`).replace('//', '/');
            }
        }
        // FIXME: should throw instead
        log.panic(`cannot resolve alias in '${str}`);
    }
    return str;
}

/**
 * Join path components into a single path without resolving path-aliases.
 * @param items - path components
 * @returns joined path
 */
export function resolvePathNoAlias(...items: (string | undefined)[]): string {
    return items.filter((item) => item !== undefined).join('/');
}

/**
 * Build an absolute path and resolve path-aliases.
 * NOTE: the last path-alias item in the input items invalidates any previous
 * directory items. For instance when the input looks like this:
 *
 * `['baseDir', 'subDir', '@targetbuild:', 'src']`
 *
 * ...it will be treated as:
 *
 * `['@targetbuild:', 'src']`
 *
 * @param aliasMap - a path-alias map which maps '@' aliases to absolute paths
 * @param items - one or multiple path components and path-aliases
 * @returns an absolute path with resolved path aliases
 */
export function resolvePath(aliasMap: Record<string, string>, ...items: (string | undefined)[]): string {
    const lastAliasIndex = items.findLastIndex((item) => (item !== undefined) ? item.startsWith('@') : false);
    if (lastAliasIndex > 0) {
        items = items.toSpliced(0, lastAliasIndex);
    }
    return resolveAlias(aliasMap, resolvePathNoAlias(...items));
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
        const { code: exitCode, stdout: cmdStdout, stderr: cmdStderr } = await command.output()
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
export async function download(options: { url: string; dir: string; filename: string; abortOnError?: boolean }): Promise<boolean> {
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
 * Removes a new array with all undefined and null items removed.
 * @param array - an array with potential undefined or null items
 * @returns a new array with undefined and null items removed
 */
export function arrayRemoveNullish<T>(array: (T | undefined | null)[]): T[] {
    return array.filter((item) => ((item !== undefined) && (item !== null))) as T[];
}

/**
 * If passed undefined, returns undefined. If passed an array, returns a new
 * array with all undefined and null items removed.
 * @param array - optional array with potential undefined or null items
 * @returns a new array with undefined and null items removed, or undefined
 */
export function optionalArrayRemoveNullish<T>(array: (T | undefined | null)[] | undefined): T[] | undefined {
    if (array === undefined) {
        return undefined;
    }
    return arrayRemoveNullish(array);
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
    expected: Record<string, { type: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]' | 'boolean[]'; optional: boolean }>,
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
