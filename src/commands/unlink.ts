import { CommandDesc, imports, log, Project } from '../../mod.ts';

export const unlinkCmd: CommandDesc = { name: 'unlink', help, run };

function help() {
    log.helpCmd([
        'unlink [import]',
    ], 'unlink an import from a local directory');
}

async function run(project: Project) {
    if (Deno.args.length !== 2) {
        log.error('expected arg [import] (run \'fibs help unlink\')');
    }
    const imp = Deno.args[1];
    imports.unlink(project, imp);
}
