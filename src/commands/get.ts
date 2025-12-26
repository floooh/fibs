import { log, settings } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';

export const getCmd: CommandDesc = { name: 'get', help, run };

function help() {
    log.helpCmd([
        'get [key]',
    ], [
        'get settings value by key',
        "run 'fibs list settings' to get list of valid keys",
    ]);
}

async function run(project: Project, args: string[]) {
    if (args.length !== 2) {
        log.panic('expected [key] arg');
    }
    const key = args[1];
    const val = settings.get(project, key);
    if (val !== undefined) {
        log.print(val);
    }
}
