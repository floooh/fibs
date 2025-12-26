import { log, settings } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';

export const unsetCmd: CommandDesc = { name: 'unset', help, run };

function help() {
    log.helpCmd([
        'unset [key]',
    ], [
        'unset a settings item to its default value',
        "run 'fibs list settings' to get list of valid keys",
    ]);
}

async function run(project: Project, args: string[]) {
    if (args.length !== 2) {
        log.panic('expected [key] arg');
    }
    const key = args[1];
    settings.unset(project, key);
}
