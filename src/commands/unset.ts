import { Command, Project, log, settings } from '../../mod.ts';

export const unset: Command = {
    name: 'unset',
    help: help,
    run: run,
};

function help(project: Project) {
    log.help([
        'unset [key]',
    ],  'unsets a settings item to its default value');
}

async function run(project: Project) {
    if (Deno.args.length !== 2) {
        log.error('expected [key] arg');
    }
    const key = Deno.args[1];
    settings.unset(project, key);
}
