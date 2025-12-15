import { util, git, log } from './index.ts';
import { Import, ImportDesc, Project, FibsModule, assertFibsModule } from '../types.ts';

export async function fetchImport(
    project: Project,
    importDesc: ImportDesc,
): Promise<{ valid: boolean; dir: string }> {
    const { name, url, ref } = importDesc;
    const links = loadImportLinks(project);
    const linkDir = links[name];
    if (linkDir !== undefined) {
        // override link
        const res = {
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
        const repoDir = git.getDir(importsDir, url, ref);
        const res = {
            valid: false,
            dir: repoDir,
        };
        if (util.dirExists(res.dir)) {
            res.valid = true;
            return res;
        } else {
            if (!await git.clone({ url, dir: importsDir, ref })) {
                log.warn(`Failed to clone ${url} into ${res.dir}`);
                return res;
            }
            res.valid = true;
        }
        return res;
    }
}

export async function importModulesFromDir(
    dir: string,
    importDesc: ImportDesc,
): Promise<{ importErrors: unknown[]; modules: FibsModule[] }> {
    const res: Awaited<ReturnType<typeof importModulesFromDir>> = {
        importErrors: [],
        modules: [],
    };
    const files = importDesc.files ? importDesc.files : ['fibs.ts'];
    const settledResults = await Promise.allSettled<FibsModule>(files.map((file) => {
        return import(`file://${dir}/${file}`);
    }));
    settledResults.forEach((settledResult) => {
        if (settledResult.status === 'fulfilled') {
            const module = settledResult.value;
            try {
                assertFibsModule(module);
                res.modules.push(module);
            } catch (err) {
                log.warn('importing module failed with:', err);
                res.importErrors.push(err);
            }
        } else {
            log.warn('importing module failed with:', settledResult.reason);
            res.importErrors.push(settledResult.reason);
        }
    });
    return res;
}

export async function validate(
    project: Project,
    imp: Import,
    options: { silent?: boolean; abortOnError?: boolean },
): Promise<{ valid: boolean; hints: string[] }> {
    const {
        silent = false,
        abortOnError = true,
    } = options;
    const res: Awaited<ReturnType<typeof validate>> = { valid: true, hints: [] };

    const dir = imp.importDir;
    if (!util.dirExists(dir)) {
        res.valid = false;
        res.hints.push(`directory does not exist: ${dir}`);
    }
    if (!res.valid && !silent) {
        const msg = [`import '${imp.name} not valid:\n`, ...res.hints].join('\n  ') + '\n';
        if (abortOnError) {
            log.panic(msg);
        } else {
            log.warn(msg);
        }
    }
    return res;
}

function loadImportLinks(project: Project): Record<string, string | undefined> {
    let result: ReturnType<typeof loadImportLinks> = {};
    const linksJsonPath = `${util.ensureFibsDir(project)}/links.json`;
    if (util.fileExists(linksJsonPath)) {
        try {
            result = JSON.parse(Deno.readTextFileSync(linksJsonPath));
        } catch (err) {
            log.panic(`Failed to load '${linksJsonPath}': ${err}`);
        }
    }
    return result;
}

function saveImportLinks(project: Project, links: Record<string, string | undefined>) {
    const linksJsonPath = `${util.ensureFibsDir(project)}/links.json`;
    try {
        Deno.writeTextFileSync(linksJsonPath, JSON.stringify(links, null, 2));
    } catch (err) {
        log.panic(`Failed to write '${linksJsonPath}': ${err}`);
    }
}

function linkUnlink(project: Project, importName: string, path: string | undefined): string | undefined {
    if (!util.find(importName, project.imports)) {
        log.panic(`import '${importName}' not found (run 'fibs list imports')`);
    }
    if (path !== undefined) {
        if (!util.dirExists(path)) {
            log.panic(`directory '${path}' does not exist`);
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

export function isLinked(project: Project, importName: string) {
    const links = loadImportLinks(project);
    return (links[importName] !== undefined);
}
