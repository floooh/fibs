import { Project } from './types.ts';
import * as util from './util.ts';
import * as host from './host.ts';
import * as log from './log.ts';
import { colors } from '../deps.ts';

const SDKVERSION = 19;
const SDKNAME = `wasi-sdk-${SDKVERSION}.0`;
const URLS = {
    'linux':    `https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${SDKVERSION}/${SDKNAME}-linux.tar.gz`,
    'macos':    `https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${SDKVERSION}/${SDKNAME}-macos.tar.gz`,
    'windows':  `https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${SDKVERSION}/${SDKNAME}-mingw.tar.gz`
}

export function dir(project: Project): string {
    return `${util.sdkDir(project)}/wasisdk`;
}

export async function install(project: Project) {
    await download(project);
}

export async function uninstall(project: Project) {
    const wasisdkDir = dir(project);
    if (util.dirExists(wasisdkDir)) {
        if (log.ask(`Delete directory ${wasisdkDir}?`, false)) {
            log.info(`deleting ${wasisdkDir}...`);
            Deno.removeSync(wasisdkDir, { recursive: true });
            log.info(colors.green('done.'));
        } else {
            log.info('nothing to do.')
        }
    } else {
        log.warn('WASI SDK not installed, nothing to do.');
    }
}

export async function download(project: Project) {
    if (util.dirExists(dir(project))) {
        log.error(`WASI SDK already installed, run 'fibs wasisdk uninstall' first`);
    }
    const sdkDir = `${util.sdkDir(project)}`;
    const filename = SDKNAME + '.tgz';
    if (!project.tools.tar.exists()) {
        log.error("tar command not found (run 'fibs diag tools'");
    }
    log.section('downloading WASI SDK');
    const url = URLS[host.platform()];
    await util.download({ url, dir: sdkDir, filename });
    log.info(colors.green('ok       '));
    log.section('uncompressing WASI SDK');
    await util.runCmd('tar', {
        args: ['xf', filename],
        cwd: sdkDir,
    });
    Deno.rename(`${sdkDir}/${SDKNAME}`, `${sdkDir}/wasisdk`);
    Deno.removeSync(`${sdkDir}/${filename}`);
    log.info(colors.green('ok'));
}
