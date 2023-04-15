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
    const links = loadImportLinks(project);
    const linkDir = links[options.name]
    if (linkDir !== undefined) {
        // override link
        const res: FetchResult = {
            valid: util.dirExists(linkDir),
            dir: linkDir,
        };
        if (!res.valid) {
            log.warn(`Linked directory ${res.dir} does not exist`);
        }
        return res;
    } else {
        // regular import
        const importsDir = util.ensureImportsDir(project);
        const dirname = path.parse(new URLPattern(options.url).pathname).name;
        const res: FetchResult = {
            valid: false,
            dir: `${importsDir}/${dirname}`,
        };
        if (util.dirExists(res.dir)) {
            res.valid = true;
            return res;
        } else {
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
}

export type ImportProjectsResult = {
    importErrors: Error[];
    projectDescs: ProjectDesc[];
}

export async function importProjects(fromDir: string, importDesc: ImportDesc): Promise<ImportProjectsResult> {
    const res: ImportProjectsResult = {
        importErrors: [],
        projectDescs: [],
    }
    if (importDesc.project) {
        res.projectDescs.push(importDesc.project);
    }
    if (importDesc.import) {
        for (const file of importDesc.import) {
            try {
                const module = await import(`file://${fromDir}/${file}`)
                res.projectDescs.push(module.project);
            } catch (err) {
                log.warn('importing module failed with:', err);
                res.importErrors.push(err);
            }
        }
    }
    return res;
}

export function hasImportErrors(project: Project): boolean {
    return project.imports.some(imp => (imp.importErrors.length > 0));
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

function loadImportLinks(project: Project): Record<string,string|undefined> {
    let result: Record<string, string|undefined> = {};
    const linksJsonPath = `${util.ensureFibsDir(project)}/links.json`;
    if (util.fileExists(linksJsonPath)) {
        try {
            result = JSON.parse(Deno.readTextFileSync(linksJsonPath));
        } catch (err) {
            log.error(`Failed to load '${linksJsonPath}': ${err}`);
        }
    }
    return result;
}

function saveImportLinks(project: Project, links: Record<string,string|undefined>) {
    const linksJsonPath = `${util.ensureFibsDir(project)}/links.json`;
    try {
        Deno.writeTextFileSync(linksJsonPath, JSON.stringify(links, null, 2));
    } catch (err) {
        log.error(`Failed to write '${linksJsonPath}': ${err}`);
    }
}

function linkUnlink(project: Project, importName: string, path: string | undefined): string | undefined {
    if (!util.find(importName, project.imports)) {
        log.error(`import '${importName}' not found (run 'fibs list imports')`);
    }
    if (path !== undefined) {
        if (!util.dirExists(path)) {
            log.error(`directory '${path}' does not exist`);
        }
    }
    const links = loadImportLinks(project);
    const prevLink = links[importName];
    links[importName] = path;
    saveImportLinks(project, links);
    return prevLink;
}

export function link(project: Project, importName: string, path: string) {
    linkUnlink(project, importName, path);
    log.info(`  linked import '${importName}' to '${path}'`);
}

export function unlink(project: Project, importName: string) {
    const prevLink = linkUnlink(project, importName, undefined);
    if (prevLink !== undefined) {
        log.info(`  unlink import '${importName}' form '${prevLink}'`);
    } else {
        log.info(`  import '${importName}' was not linked`);
    }
}
