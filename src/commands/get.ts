import { CommandDesc, log, Project, settings } from '../../mod.ts';

export const getCmd: CommandDesc = { help, run };

function help() {
    log.help([
        'get [key]',
    ], [
        'get settings value by key',
        'run \'fibs list settings\' to get list of valid keys',
    ]);
}

async function run(project: Project) {
    if (Deno.args.length !== 2) {
        log.error('expected [key] arg');
    }
    const key = Deno.args[1];
    const val = settings.get(project, key);
    if (val !== undefined) {
        log.print(val);
    }
}
