import { git, imports, log } from '../../lib/index.ts';
import type { CommandDesc, Project } from '../../types.ts';

export const updateCmd: CommandDesc = { name: 'update', help, run };

function help() {
    log.helpCmd([
        'update [--clean] [--force]',
        'update [import...] [--clean] [--force]',
    ], 'update all or specific import, use --clean to delete and fetch from scratch, use --force to skip the up-to-date check');
}

async function run(project: Project, cmdLineArgs: string[]) {
    const args = parseArgs(project, cmdLineArgs);
    for (const item of args.items) {
        const imp = project.import(item);
        const isLinked = imports.isLinked(project, imp.name);
        if (isLinked) {
            log.print();
            log.warn(`skipping '${imp.name}' because:`);
            log.info("  import is a linked directory (run 'fibs list imports')");
            log.print();
            if (isLinked || !args.clean) {
                continue;
            }
        }
        const repoDir = git.getDir(project.importsDir(), imp.url, imp.ref);
        if (args.clean) {
            if (log.ask(`delete and clone ${repoDir}`, false)) {
                log.info(`  deleting ${repoDir}`);
                Deno.removeSync(repoDir, { recursive: true });
                await imports.fetchImport(project, { name: imp.name, url: imp.url, ref: imp.ref }, log.verbose());
            } else {
                log.info(`  skipping ${repoDir}`);
            }
        } else {
            if (
                !await git.updateImport({
                    name: imp.name,
                    url: imp.url,
                    dir: project.importsDir(),
                    ref: imp.ref,
                    skipUptodateCheck: args.force,
                    verbose: log.verbose(),
                })
            ) {
                throw new Error(`updating '${repoDir}' failed\n\n(consider running 'fibs update --clean')\n`);
            }
        }
    }
}

function parseArgs(project: Project, args: string[]): { clean: boolean; force: boolean; items: string[] } {
    const res: ReturnType<typeof parseArgs> = { clean: false, force: false, items: [] };
    res.items = args.slice(1).filter((arg) => {
        if (arg.startsWith('--')) {
            if (arg === '--clean') {
                res.clean = true;
            } else if (arg === '--force') {
                res.force = true;
            } else {
                throw new Error(`unknown option '${arg}' (run 'fibs help update')`);
            }
            return false;
        }
        return true;
    });
    if (res.items.length === 0) {
        res.items = project.imports().toReversed().map((imp) => imp.name);
    }
    return res;
}
