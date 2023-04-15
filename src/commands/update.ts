import { CommandDesc, git, imports, log, Project, util } from '../../mod.ts';

export const updateCmd: CommandDesc = { name: 'update', help, run };

function help() {
    log.helpCmd([
        'update [--clean]',
        'update [import...] [--clean]',
    ], 'update all or specific import, use --clean to delete and fetch from scratch');
}

type Args = {
    clean: boolean;
    items: string[];
};

async function run(project: Project) {
    const args = parseArgs(project);
    for (const item of args.items) {
        const imp = util.find(item, project.imports)!;
        const dir = imp.importDir;
        log.section(`${imp.name}`);
        const hasUncommittedChanges = await git.hasUncommittedChanges({ dir: imp.importDir, showCmd: false });
        const hasUnpushedChanges = await git.hasUnpushedChanges({ dir: imp.importDir, showCmd: false });
        if (hasUncommittedChanges || hasUnpushedChanges) {
            log.print();
            log.warn(`skipping '${dir}' because:`);
            if (hasUncommittedChanges) {
                log.info('  local repository has uncommitted changes\n');
            }
            if (hasUnpushedChanges) {
                log.info('  local repository has unpushed changes\n');
            }
            if (!args.clean) {
                continue;
            }
        }
        if (args.clean) {
            if (log.ask(`delete and clone ${dir}`, false)) {
                log.info(`  deleting ${dir}`);
                Deno.removeSync(dir, { recursive: true });
                await imports.fetch(project, { name: imp.name, url: imp.url, ref: imp.ref });
            } else {
                log.info(`  skipping ${dir}`);
            }
        } else {
            if (!await git.pullOrFetch({ dir: imp.importDir, ref: imp.ref, showCmd: true })) {
                log.print();
                log.error(`updating '${dir}' failed\n\n(consider running 'fibs update --clean')\n`);
            }
        }
    }
}

function parseArgs(project: Project): Args {
    const res: Args = { clean: false, items: [] };
    res.items = Deno.args.slice(1).filter((arg) => {
        if (arg.startsWith('--')) {
            if (arg === '--clean') {
                res.clean = true;
            } else {
                log.error(`unknown option '${arg}' (run 'fibs help update')`);
            }
            return false;
        }
        return true;
    });
    if (res.items.length === 0) {
        res.items = project.imports.map((imp) => imp.name);
    }
    for (const item of res.items) {
        if (util.find(item, project.imports) === undefined) {
            log.error(`import '${item}' not found (run 'fibs list imports')`);
        }
    }
    return res;
}
