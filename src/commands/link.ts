import { imports, log } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';
import { resolve } from '@std/path';

export const linkCmd: CommandDesc = { name: 'link', help, run };

function help() {
    log.helpCmd([
        'link [import] [directory]',
    ], 'link an import to an existing directory');
}

async function run(project: Project, args: string[]) {
    if (args.length !== 3) {
        log.panic("expected args [import] and [directory] (run 'fibs help link')");
    }
    const imp = args[1];
    const dir = resolve(args[2]);
    imports.link(project, imp, dir);
}
