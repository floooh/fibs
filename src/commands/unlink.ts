import { imports, log } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';

export const unlinkCmd: CommandDesc = { name: 'unlink', help, run };

function help() {
    log.helpCmd([
        'unlink [import]',
    ], 'unlink an import from a local directory');
}

async function run(project: Project, args: string[]) {
    if (args.length !== 2) {
        throw new Error("expected arg [import] (run 'fibs help unlink')");
    }
    const imp = args[1];
    imports.unlink(project, imp);
}
