import { CommandDesc, git, imports, log, Project, util } from '../../index.ts';

export const updateCmd: CommandDesc = { name: 'update', help, run };

function help() {
    log.helpCmd([
        'update [--clean]',
        'update [import...] [--clean]',
    ], 'update all or specific import, use --clean to delete and fetch from scratch');
}

async function run(project: Project) {
    const args = parseArgs(project);
    for (const item of args.items) {
        const imp = util.find(item, project.imports)!;
        log.section(`${imp.name}`);
        const isLinked = imports.isLinked(project, imp.name);
        if (isLinked) {
            log.print();
            log.warn(`skipping '${imp.name}' because:`);
            log.info('  import is a linked directory (run \'fibs list imports\')');
            log.print();
            if (isLinked || !args.clean) {
                continue;
            }
        }
        const repoDir = git.getDir(util.importsDir(project), imp.url, imp.ref);
        if (args.clean) {
            if (log.ask(`delete and clone ${repoDir}`, false)) {
                log.info(`  deleting ${repoDir}`);
                Deno.removeSync(repoDir, { recursive: true });
                await imports.fetch(project, { name: imp.name, url: imp.url, ref: imp.ref });
            } else {
                log.info(`  skipping ${repoDir}`);
            }
        } else {
            if (!await git.update({ dir: util.importsDir(project), url: imp.url, ref: imp.ref, showCmd: true })) {
                log.print();
                log.panic(`updating '${repoDir}' failed\n\n(consider running 'fibs update --clean')\n`);
            }
        }
    }
}

function parseArgs(project: Project): { clean: boolean; items: string[] } {
    const res: ReturnType<typeof parseArgs> = { clean: false, items: [] };
    res.items = Deno.args.slice(1).filter((arg) => {
        if (arg.startsWith('--')) {
            if (arg === '--clean') {
                res.clean = true;
            } else {
                log.panic(`unknown option '${arg}' (run 'fibs help update')`);
            }
            return false;
        }
        return true;
    });
    if (res.items.length === 0) {
        res.items = project.imports.toReversed().map((imp) => imp.name);
    }
    for (const item of res.items) {
        if (util.find(item, project.imports) === undefined) {
            log.panic(`import '${item}' not found (run 'fibs list imports')`);
        }
    }
    return res;
}
