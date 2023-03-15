import { Project } from './types.ts';
import * as util from './util.ts';
import * as log from './log.ts';
import * as git from './git.ts';
import { colors } from '../deps.ts';

const EMSDK_URL = 'https://github.com/emscripten-core/emsdk.git';

export function dir(project: Project): string {
    return `${util.sdkDir(project)}/emsdk`;
}

export function toolPath(project: Project): string {
    return `${dir(project)}/emsdk`;
}

export async function run(project: Project, args: string[]): Promise<number> {
    const cmd = toolPath(project);
    if (!util.fileExists(cmd)) {
        log.error(`emsdk tool not found at ${toolPath}, run 'fibs emsdk install`);
    }
    const res = await util.runCmd(cmd, { args, cwd: dir(project), winUseCmd: true });
    return res.exitCode;
}

export async function install(project: Project, version: string) {
    await cloneOrUpdateEmsdk(project);
    await run(project, ['install', '--shallow', '--disable-assertions', version]);
    await activate(project, version);
}

export async function activate(project: Project, version: string) {
    log.section(`activing emsdk version '${version}'`);
    await run(project, ['activate', '--embedded', version]);
}

export async function cloneOrUpdateEmsdk(project: Project) {
    const sdkRoot = util.ensureSdkDir(project);
    const emsdkDir = dir(project);
    if (util.dirExists(emsdkDir)) {
        log.section(`updating emsdk in ${emsdkDir}`);
        await git.pull({ dir: emsdkDir, force: true });
    } else {
        log.section(`cloning emsdk to ${emsdkDir} `);
        await git.clone({ url: EMSDK_URL, dir: sdkRoot, recursive: true, depth: 1 });
    }
}

export async function list(project: Project) {
    await run(project, ['list']);
}

export async function uninstall(project: Project) {
    const emsdkDir = dir(project);
    if (util.dirExists(emsdkDir)) {
        if (log.ask(`Delete directory ${emsdkDir}?`, false)) {
            log.info(`deleting ${emsdkDir}...`);
            Deno.removeSync(emsdkDir, { recursive: true });
            log.info(colors.green('done.'));
        } else {
            log.info('nothing to do.');
        }
    } else {
        log.warn('Emscripten SDK not installed, nothing to do.');
    }
}
