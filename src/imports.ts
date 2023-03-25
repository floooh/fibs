import { Import, ImportDesc, Project, ProjectDesc } from './types.ts';
import * as util from './util.ts';
import * as git from './git.ts';
import * as log from './log.ts';
import { path } from '../deps.ts';

export type FetchOptions = {
    name: string;
    url: string;
    ref?: string;
}

export type FetchResult = {
    valid: boolean;
    dir: string;
};

export async function fetch(project: Project, options: FetchOptions): Promise<FetchResult> {
    const importsDir = util.ensureImportsDir(project);
    const dirname = path.parse(new URLPattern(options.url).pathname).name;
    const res: FetchResult = {
        valid: false,
        dir: `${importsDir}/${dirname}`,
    };
    if (util.dirExists(res.dir)) {
        res.valid = true;
        return res;
    }
    if (!util.dirExists(res.dir)) {
        if (!await git.clone({
            url: options.url,
            dir: importsDir,
            name: dirname,
            ref: options.ref,
            // only shallow-clone if no ref is specified
            depth: (options.ref === undefined) ? 1 : undefined,
        })) {
            log.warn(`Failed to clone ${options.url} into ${res.dir}`);
            return res;
        }
        res.valid = true;
    }
    return res;
}

export async function importProjects(fromDir: string, importDesc: ImportDesc): Promise<ProjectDesc[]> {
    const res: ProjectDesc[] = [];
    if (importDesc.project) {
        res.push(importDesc.project);
    }
    if (importDesc.import) {
        for (const file of importDesc.import) {
            try {
                const module = await import(`file://${fromDir}/${file}`)
                res.push(module.project);
            } catch (err) {
                log.warn(`importing module failed with: ${err}`);
            }
        }
    }
    return res;

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
