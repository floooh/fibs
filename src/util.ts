import { Config, Platform, Project } from './types.ts';
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

export function deployDir(project: Project, config: Config): string {
    return `${fibsDir(project)}/.fibs/deploy/${config.name}`;
}

export function ensureDeployDir(project: Project, config: Config): string {
    const path = deployDir(project, config);
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
