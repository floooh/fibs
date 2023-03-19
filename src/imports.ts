import { Import, Project, ProjectDesc } from './types.ts';
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
            ref: options.ref,
            // only shallow-clone if no ref is specified
            depth: (options.ref === undefined) ? 1 : undefined,
        })
    ) {
        log.warn(`Failed to clone ${options.url} into ${res.path}`);
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

export type ValidateOptions = {
    silent?: boolean;
    abortOnError?: boolean;
};

export type ValidateResult = {
    valid: boolean;
    hints: string[];
};

export async function validate(project: Project, imp: Import, options: ValidateOptions): Promise<ValidateResult> {
    const {
        silent = false,
        abortOnError = true,
    } = options;
    const res: ValidateResult = { valid: true, hints: [] };

    const dir = imp.importDir;
    if (!util.dirExists(dir)) {
        res.valid = false;
        res.hints.push(`directory does not exists: ${dir}`);
    }

    if (await git.hasUncommittedChanges({ dir, showCmd: false })) {
        res.valid = false;
        res.hints.push(`uncommitted changes in '${dir}'`);
    }

    if (await git.hasUnpushedChanges({ dir, showCmd: false })) {
        res.valid = false;
        res.hints.push(`unpushed changes in '${dir}'`);
    }

    if (!res.valid && !silent) {
        const msg = [`import '${imp.name} not valid:\n`, ...res.hints].join('\n  ') + '\n';
        if (abortOnError) {
            log.error(msg);
        } else {
            log.warn(msg);
        }
    }
    return res;
}
