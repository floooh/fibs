import { imports, log } from '../lib/index.ts';
import { CommandDesc, Project } from '../types.ts';

export const unlinkCmd: CommandDesc = { name: 'unlink', help, run };

function help() {
    log.helpCmd([
        'unlink [import]',
    ], 'unlink an import from a local directory');
}

async function run(project: Project) {
    if (Deno.args.length !== 2) {
        log.panic("expected arg [import] (run 'fibs help unlink')");
    }
    const imp = Deno.args[1];
    imports.unlink(project, imp);
}
