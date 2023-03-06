import { CommandDesc, log, Project, settings } from '../../mod.ts';

export const set: CommandDesc = {
    help: help,
    run: run,
};

function help() {
    log.help([
        'set [key] [value]',
    ], [
        'set a project settings key/value item',
        'run \'fibs list settings\' to get list of valid keys',
    ]);
}

async function run(project: Project) {
    if (Deno.args.length !== 3) {
        log.error('expected [key] and [value] args');
    }
    const key = Deno.args[1];
    const val = Deno.args[2];
    settings.set(project, key, val);
}
