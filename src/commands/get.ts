import { Command, Project, log, settings } from '../../mod.ts';

export const get: Command = {
    name: 'get',
    help: help,
    run: run,
};

function help(project: Project) {
    log.help([
        'get [key]',
    ],  "get settings value by key (run 'fibs list settings' to list valid keys");
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
