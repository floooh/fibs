import { CommandDesc, emsdk, log, Project } from '../../mod.ts';

export const emsdkCmd: CommandDesc = { name: 'emsdk', help, run };

function help() {
    log.helpCmd([
        'emsdk install [version=latest]',
        'emsdk list',
        'emsdk uninstall',
    ], 'install and maintain the Emscripten SDK');
}

type Args = {
    install?: boolean;
    list?: boolean;
    uninstall?: boolean;
    version?: string;
};

async function run(project: Project) {
    const args = parseArgs();
    if (args.install && args.version) {
        await emsdk.install(project, args.version);
    } else if (args.list) {
        await emsdk.list(project);
    } else if (args.uninstall) {
        await emsdk.uninstall(project);
    }
}

function parseArgs(): Args {
    const args: Args = {};
    if (Deno.args[1] === undefined) {
        log.error('expected a subcommand (run \'fibs help emsdk\')');
    }
    switch (Deno.args[1]) {
        case 'install':
            args.install = true;
            args.version = Deno.args[2];
            if (args.version === undefined) {
                args.version = 'latest';
            }
            break;
        case 'list':
            args.list = true;
            break;
        case 'uninstall':
            args.uninstall = true;
            break;
        default:
            log.error(`unknown subcommand '${Deno.args[1]} (run 'fibs help emsdk')`);
    }
    return args;
}
