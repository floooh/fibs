import { Project, Config } from './types.ts';

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

export function buildDir(project: Project, config: Config): string {
    return `${project.dir}/.fibs/build/${config.name}`;
}

export function deployDir(project: Project, config: Config): string {
    return `${project.dir}/.fibs/deploy/${config.name}`;
}
