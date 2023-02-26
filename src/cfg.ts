import { Project, Config } from './types.ts';

export function buildDir(project: Project, config: Config): string {
    return `${project.dir}/.fibs/build/${config.name}`;
}

export function deployDir(project: Project, config: Config): string {
    return `${project.dir}/.fibs/deploy/${config.name}`;
}
