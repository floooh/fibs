import { RunOptions, RunResult } from './types.ts';
import * as util from './util.ts';
import * as log from './log.ts';
import { fs, path } from '../../deps.ts';

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.runCmd('git', options);
    } catch (err) {
        log.error(`Failed running git with: ${err.message}`);
    }
}

export async function exists(): Promise<boolean> {
    try {
        // NOTE: cannot use local run() function since this would terminate on error!
        await util.runCmd('git', { args: ['--version'], stdout: 'piped', showCmd: false, abortOnError: false });
        return true;
    } catch (_err) {
        return false;
    }
}

export function getDir(baseDir: string, url: string, ref?: string): string {
    const repoName = path.parse(new URLPattern(url).pathname).name;
    let repoDir = `${baseDir}/${repoName}`;
    if ((ref !== undefined) && (ref !== 'HEAD')) {
        repoDir += `@${ref}`;
    }
    return repoDir;
}

export async function clone(options: { url: string; dir: string; ref?: string; showCmd?: boolean }): Promise<boolean> {
    const {
        url,
        dir,
        ref = 'HEAD',
        showCmd = true,
    } = options;
    let repoDir = getDir(dir, url, ref);
    if (util.dirExists(repoDir)) {
        log.error(`git clone directory ${repoDir} already exists!`);
    }
    fs.ensureDirSync(repoDir);
    if ((await run({ args: ['init', '-q'], cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    if ((await run({ args: ['remote', 'add', 'origin', url], cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    if ((await run({ args: ['remote', 'set-url', '--push', 'origin', 'nopush'], cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    if ((await run({ args: ['fetch', '--depth=1', 'origin', ref], cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    if ((await run({ args: ['-c', 'advice.detachedHead=false', 'checkout', 'FETCH_HEAD'], cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    return await updateSubmodules({ url, dir, ref, showCmd });
}

export async function update(options: { url: string; dir: string; ref?: string; force?: boolean; showCmd?: boolean }): Promise<boolean> {
    const {
        url,
        dir,
        ref = 'HEAD',
        force = false,
        showCmd = true,
    } = options;
    let repoDir = getDir(dir, url, ref);
    const args = ['fetch', '--depth=1', 'origin', ref];
    if (force) {
        args.push('-f');
    }
    if ((await run({ args, cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    if ((await run({ args: ['-c', 'advice.detachedHead=false', 'checkout', 'FETCH_HEAD'], cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    return await updateSubmodules({ url, dir, ref, showCmd });
}

export async function updateSubmodules(options: { url: string; dir: string; ref: string; showCmd?: boolean }): Promise<boolean> {
    const { url, dir, ref, showCmd = true } = options;
    const repoDir = getDir(dir, url, ref);
    if ((await run({ args: ['submodule', 'init'], cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    if ((await run({ args: ['submodule', 'sync', '--recursive'], cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    if ((await run({ args: ['submodule', 'update', '--recursive', '--depth=1'], cwd: repoDir, showCmd })).exitCode !== 0) {
        return false;
    }
    return true;
}

export async function hasUncommittedChanges(options: { url: string; dir: string; ref: string; showCmd?: boolean }): Promise<boolean> {
    const { url, dir, ref, showCmd = true } = options;
    const repoDir = getDir(dir, url, ref);
    const res = await run({ args: ['status', '-s'], cwd: repoDir, showCmd, stdout: 'piped' });
    return 0 !== res.stdout.length;
}

export async function hasUnpushedChanges(options: { url: string; dir: string; ref: string; showCmd?: boolean }): Promise<boolean> {
    const { url, dir, ref, showCmd = true } = options;
    const repoDir = getDir(dir, url, ref);
    const res = await run({
        args: ['log', '--branches', '--not', '--remotes', '--oneline'],
        cwd: repoDir,
        showCmd,
        stdout: 'piped',
    });
    return 0 !== res.stdout.length;
}
