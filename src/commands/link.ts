import { CommandDesc, Project, imports, log } from '../../mod.ts';
import { path } from '../../deps.ts';

export const linkCmd: CommandDesc = { help, run };

function help() {
    log.helpCmd([
        'link [import] [directory]'
    ], 'link an import to an existing directory');
}

async function run(project: Project) {
    if (Deno.args.length !== 3) {
        log.error("expected args [import] and [directory] (run 'fibs help link')");
    }
    const imp = Deno.args[1];
    const dir = path.resolve(Deno.args[2]);
    imports.link(project, imp, dir)
}
