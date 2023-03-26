import { CommandDesc, log, Project, settings } from '../../mod.ts';

export const unsetCmd: CommandDesc = { help, run };

function help() {
    log.helpCmd([
        'unset [key]',
    ], [
        'unset a settings item to its default value',
        'run \'fibs list settings\' to get list of valid keys',
    ]);
}

async function run(project: Project) {
    if (Deno.args.length !== 2) {
        log.error('expected [key] arg');
    }
    const key = Deno.args[1];
    settings.unset(project, key);
}
