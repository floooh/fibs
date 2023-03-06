import { CommandDesc, Project, log, util, git } from '../../mod.ts';
import { colors } from '../../deps.ts';

const EMSDK_URL = 'https://github.com/emscripten-core/emsdk.git';

export const emsdk: CommandDesc = {
    help: help,
    run: run,
};

function help() {
    log.help([
        'emsdk install [version=latest]',
        'emsdk list',
        'emsdk uninstall',
    ], 'install and maintain the Emscripten SDK');
}

type Args = {
    install?: boolean,
    list?: boolean,
    uninstall?: boolean,
    version?: string,
}

async function run(project: Project) {
    const args = parseArgs();
    if (args.install && args.version) {
        await install(project, args.version);
    } else if (args.list) {
        await list(project);
    } else if (args.uninstall) {
        await uninstall(project);
    }
}

function parseArgs(): Args {
    const args: Args = {};
    if (Deno.args[1] === undefined) {
        log.error("expected a subcommand (run 'fibs help emsdk')");
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

function getEmsdkDir(project: Project): string {
    return `${util.sdkDir(project)}/emsdk`;
}

function getEmsdkToolPath(project: Project): string {
    return`${getEmsdkDir(project)}/emsdk`;
}

async function runEmsdkTool(project: Project, args: string[]): Promise<number> {
    const toolPath = getEmsdkToolPath(project);
    if (!util.fileExists(toolPath)) {
        log.error(`emsdk tool not found at ${toolPath}, run 'fibs emsdk install`);
    }
    const res = await util.runCmd(toolPath, { args, cwd: getEmsdkDir(project) })
    return res.exitCode;
}

async function install(project: Project, version: string) {
    await cloneOrUpdateEmsdk(project);
    await runEmsdkTool(project, ['install', '--shallow', '--disable-assertions', version ]);
    await activate(project, version);
}

async function activate(project: Project, version: string) {
    log.section(`activing emsdk version '${version}'`);
    await runEmsdkTool(project, ['activate', '--embedded', version ]);
}

async function cloneOrUpdateEmsdk(project: Project) {
    const sdkRoot = util.ensureSdkDir(project);
    const emsdkDir = getEmsdkDir(project);
    if (util.dirExists(emsdkDir)) {
        log.section(`updating emsdk in ${emsdkDir}`);
        await git.pull({ dir: emsdkDir, force: true });
    } else {
        log.section(`cloning emsdk to ${emsdkDir} `)
        await git.clone({ url: EMSDK_URL, dir: sdkRoot, recursive: true, depth: 1 });
    }
}

async function list(project: Project) {
    await runEmsdkTool(project, ['list']);
}

async function uninstall(project: Project) {
    const emsdkDir = getEmsdkDir(project);
    if (util.dirExists(emsdkDir)) {
        if (log.ask(`Delete directory ${emsdkDir}?`, false)) {
            log.info(`deleting ${emsdkDir}...`);
            Deno.removeSync(emsdkDir, { recursive: true });
            log.info(colors.green('done.'));
        } else {
            log.info('nothing to do.')
        }
    } else {
        log.warn('Emscripten SDK not installed, nothing to do.');
    }
}
