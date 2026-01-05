import { util } from './index.ts';
import type { RunOptions, RunResult } from '../types.ts';
import { path } from '../deps.ts';

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.runCmd('git', options);
    } catch (err) {
        throw new Error('Failed running git', { cause: err });
    }
}

export async function exists(): Promise<boolean> {
    try {
        await run({ args: ['--version'], stdout: 'null', showCmd: false });
        return true;
    } catch (_err) {
        return false;
    }
}

export function fmtGitUrl(url: string, ref?: string): string {
    if (ref === undefined) {
        return url;
    } else {
        return `${url}@${ref}`;
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

export async function clone(options: { url: string; dir: string; ref?: string; verbose?: boolean }): Promise<boolean> {
    const {
        url,
        dir,
        ref = 'HEAD',
        verbose = false,
    } = options;
    const repoDir = getDir(dir, url, ref);
    if (util.dirExists(repoDir)) {
        throw new Error(`git clone directory ${repoDir} already exists!`);
    }
    util.ensureDir(repoDir);
    const runOpts: RunOptions = { args: [], cwd: repoDir, stderr: verbose ? 'inherit' : 'null', showCmd: verbose };
    if ((await run({ ...runOpts, args: ['init', '-q'] })).exitCode !== 0) {
        return false;
    }
    if ((await run({ ...runOpts, args: ['remote', 'add', 'origin', url] })).exitCode !== 0) {
        return false;
    }
    if (
        (await run({ ...runOpts, args: ['remote', 'set-url', '--push', 'origin', 'nopush'] })).exitCode !== 0
    ) {
        return false;
    }
    if ((await run({ ...runOpts, args: ['fetch', '--depth=1', 'origin', ref] })).exitCode !== 0) {
        return false;
    }
    if (
        (await run({ ...runOpts, args: ['-c', 'advice.detachedHead=false', 'checkout', 'FETCH_HEAD'] }))
            .exitCode !== 0
    ) {
        return false;
    }
    return await updateSubmodules({ url, dir, ref, verbose });
}

export async function update(
    options: { url: string; dir: string; ref?: string; force?: boolean; verbose?: boolean },
): Promise<boolean> {
    const {
        url,
        dir,
        ref = 'HEAD',
        force = false,
        verbose = false,
    } = options;
    const repoDir = getDir(dir, url, ref);
    const runOpts: RunOptions = { args: [], cwd: repoDir, stderr: verbose ? 'inherit' : 'null', showCmd: verbose };
    const args = ['fetch', '--depth=1', 'origin', ref];
    if (force) {
        args.push('-f');
    }
    if ((await run({ ...runOpts, args })).exitCode !== 0) {
        return false;
    }
    if (
        (await run({ ...runOpts, args: ['-c', 'advice.detachedHead=false', 'checkout', 'FETCH_HEAD'] }))
            .exitCode !== 0
    ) {
        return false;
    }
    return await updateSubmodules({ url, dir, ref, verbose });
}

export async function updateSubmodules(
    options: { url: string; dir: string; ref: string; verbose?: boolean },
): Promise<boolean> {
    const { url, dir, ref, verbose = false } = options;
    const repoDir = getDir(dir, url, ref);
    if ((await run({ args: ['submodule', 'init'], cwd: repoDir, showCmd: verbose })).exitCode !== 0) {
        return false;
    }
    if ((await run({ args: ['submodule', 'sync', '--recursive'], cwd: repoDir, showCmd: verbose })).exitCode !== 0) {
        return false;
    }
    if (
        (await run({ args: ['submodule', 'update', '--recursive', '--depth=1'], cwd: repoDir, showCmd: verbose })).exitCode !== 0
    ) {
        return false;
    }
    return true;
}
