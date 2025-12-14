import { log, settings } from '../lib/index.ts';
import { CommandDesc, Project } from '../../index.ts';

export const setCmd: CommandDesc = { name: 'set', help, run };

function help() {
    log.helpCmd([
        'set [key] [value]',
    ], [
        'set a project settings key/value item',
        'run \'fibs list settings\' to get list of valid keys',
    ]);
}

async function run(project: Project) {
    if (Deno.args.length !== 3) {
        log.panic('expected [key] and [value] args');
    }
    const key = Deno.args[1];
    const val = Deno.args[2];
    settings.set(project, key, val);
}
