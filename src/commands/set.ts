import { log, settings } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';

export const setCmd: CommandDesc = { name: 'set', help, run };

function help() {
    log.helpCmd([
        'set [key] [value]',
    ], [
        'set a project settings key/value item',
        "run 'fibs list settings' to get list of valid keys",
    ]);
}

async function run(project: Project, args: string[]) {
    if (args.length !== 3) {
        log.panic('expected [key] and [value] args');
    }
    const key = args[1];
    const val = args[2];
    settings.set(project, key, val);
}
