import { Project, ProjectDesc } from './types.ts';
import * as util from './util.ts';
import * as git from './git.ts';
import * as log from './log.ts';

export type FetchOptions = {
    name: string;
    url: string;
    ref?: string;
};

export type FetchResult = {
    valid: boolean;
    path: string;
    projectDesc: ProjectDesc | undefined;
};

export async function fetch(project: Project, options: FetchOptions): Promise<FetchResult> {
    const importsDir = util.ensureImportsDir(project);
    const res: FetchResult = {
        valid: false,
        path: `${importsDir}/${options.name}`,
        projectDesc: undefined,
    };
    // shortcut import directory already exists
    if (util.dirExists(res.path)) {
        // FIXME: handle import error via try-catch here?
        res.valid = true;
        res.projectDesc = await importOptionalFibsModule(res.path);
        return res;
    }
    // otherwise fetch via git
    if (
        !await git.clone({
            url: options.url,
            dir: importsDir,
            name: options.name,
            recursive: true,
            // only shallow-clone if no ref is specified
            depth: (options.ref === undefined) ? 1 : undefined,
        })
    ) {
        log.warn(`Failed to clone ${options.url} into ${res.path}`);
        return res;
    }
    if (options.ref) {
        if (
            !await git.checkout({
                dir: res.path,
                ref: options.ref,
            })
        ) {
            log.warn(`Failed to checkout ${options.ref} in ${res.path}`);
        }
        return res;
    }

    // FIXME: handle import error via try-catch here?
    res.valid = true;
    res.projectDesc = await importOptionalFibsModule(res.path);
    return res;
}

async function importOptionalFibsModule(dir: string): Promise<ProjectDesc | undefined> {
    const fibsPath = `${dir}/fibs.ts`;
    if (util.fileExists(fibsPath)) {
        const module = await import(`file://${fibsPath}`);
        return module.projectDesc;
    }
    return undefined;
}
