import {
    Config,
    Platform,
    Project,
    RunOptions,
    RunResult,
    TargetBuildContext,
    TargetItems,
    TargetItemsFunc,
} from './types.ts';
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

export function buildAliasMap(project: Project, config: Config, importDir: string | undefined): Record<string, string> {
    return {
        '@root': project.dir,
        '@self': (importDir !== undefined) ? importDir : project.dir,
        '@sdks': sdkDir(project),
        '@build': buildDir(project, config),
        '@dist': distDir(project, config),
    };
}

export function resolveAlias(str: string, aliasMap: Record<string, string>): string {
    if ((str !== undefined) && str.startsWith('@')) {
        for (const k in aliasMap) {
            if (str.startsWith(k)) {
                return str.replace(k, aliasMap[k]);
            }
        }
    }
    return str;
}

export function resolveDirPath(baseDir: string, subDir: string | undefined): string {
    let str = baseDir + '/';
    if (subDir !== undefined) {
        str += subDir + '/';
    }
    return str;
}

export function resolveFilePath(
    baseDir: string,
    subDir: string | undefined,
    path: string,
    aliasMap: Record<string, string>,
): string {
    if (path.startsWith('@')) {
        return resolveAlias(path, aliasMap);
    } else {
        return resolveDirPath(baseDir, subDir) + path;
    }
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

export type ResolvedTargetItems = {
    interface: string[];
    private: string[];
    public: string[];
};

export function resolveTargetItems(
    items: TargetItems,
    buildContext: TargetBuildContext,
    itemsAreFilePaths: boolean,
): ResolvedTargetItems {
    const aliasMap = buildAliasMap(buildContext.project, buildContext.config, buildContext.target.importDir);
    const resolve = (items: string[] | TargetItemsFunc): string[] => {
        let resolvedItems = (typeof items === 'function') ? items(buildContext) : items;
        if (itemsAreFilePaths) {
            const target = buildContext.target;
            return resolvedItems.map((item) => resolveFilePath(target.importDir, target.dir, item, aliasMap));
        } else {
            return resolvedItems.map((item) => resolveAlias(item, aliasMap));
        }
    };
    return {
        interface: resolve(items.interface),
        private: resolve(items.private),
        public: resolve(items.public),
    };
}
