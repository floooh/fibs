import { CommandDesc, imports, log, Project } from '../../mod.ts';
import * as path from '$std/path/mod.ts';

export const linkCmd: CommandDesc = { name: 'link', help, run };

function help() {
    log.helpCmd([
        'link [import] [directory]',
    ], 'link an import to an existing directory');
}

async function run(project: Project) {
    if (Deno.args.length !== 3) {
        log.error('expected args [import] and [directory] (run \'fibs help link\')');
    }
    const imp = Deno.args[1];
    const dir = path.resolve(Deno.args[2]);
    imports.link(project, imp, dir);
}
