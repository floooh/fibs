import { CommandDesc, log, Project, wasisdk } from '../../mod.ts';

export const wasisdkCmd: CommandDesc = { help, run };

function help() {
    log.help([
        'wasisdk install',
        'wasisdk uninstall',
    ], 'install or uninstall the WASI SDK');
}

type Args = {
    install?: boolean;
    uninstall?: boolean;
};

async function run(project: Project) {
    const args = parseArgs();
    if (args.install) {
        await wasisdk.install(project);
    } else if (args.uninstall) {
        await wasisdk.uninstall(project);
    }
}

function parseArgs(): Args {
    const args: Args = {};
    if (Deno.args[1] === undefined) {
        log.error('expected a subcommand (run \'fibs help wasisdk\')');
    }
    switch (Deno.args[1]) {
        case 'install':
            args.install = true;
            break;
        case 'uninstall':
            args.uninstall = true;
            break;
        default:
            log.error(`unknown subcommand '${Deno.args[1]} (run 'fibs help wasisdk')`);
    }
    return args;
}
