import { log, util } from './index.ts';
import type { RunOptions, RunResult } from '../types.ts';
import { colors, path } from '../deps.ts';

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
    options: { url: string; dir: string; ref?: string; force?: boolean; skipUptodateCheck?: boolean; verbose?: boolean },
): Promise<boolean> {
    const {
        url,
        dir,
        ref = 'HEAD',
        force = false,
        skipUptodateCheck = false,
        verbose = false,
    } = options;
    const repoDir = getDir(dir, url, ref);
    const runOpts: RunOptions = { args: [], cwd: repoDir, stderr: verbose ? 'inherit' : 'null', showCmd: verbose };
    if (!skipUptodateCheck && await isUptodate({ url, dir, ref })) {
        // still update submodules, a previous update might have failed
        return await updateSubmodules({ url, dir, ref, sync: true, verbose });
    }
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
    // sync submodule urls, they may have changed in .gitmodules
    return await updateSubmodules({ url, dir, ref, sync: true, verbose });
}

// update an import and log progress, skip fetch if import is already up-to-date
export async function updateImport(
    options: { name: string; url: string; dir: string; ref?: string; skipUptodateCheck?: boolean; verbose?: boolean },
): Promise<boolean> {
    const { name, url, dir, ref = 'HEAD', skipUptodateCheck = false, verbose = false } = options;
    if (!skipUptodateCheck && await isUptodate({ url, dir, ref })) {
        log.info(`${colors.green('uptodate:')} ${name} (${colors.brightBlue(fmtGitUrl(url, options.ref))})`);
        // still update submodules, a previous update might have failed
        return await updateSubmodules({ url, dir, ref, sync: true, verbose });
    }
    log.info(`${colors.yellow('updating:')} ${colors.green(name)} (${colors.brightBlue(fmtGitUrl(url, options.ref))}) ...`);
    return await update({ url, dir, ref, skipUptodateCheck: true, verbose });
}

// true if local HEAD already matches the remote ref (a shallow re-fetch is slow)
export async function isUptodate(options: { url: string; dir: string; ref?: string }): Promise<boolean> {
    const { url, dir, ref = 'HEAD' } = options;
    const repoDir = getDir(dir, url, ref);
    const runOpts: RunOptions = { args: [], cwd: repoDir, stdout: 'piped', stderr: 'null', showCmd: false };
    const head = await run({ ...runOpts, args: ['rev-parse', 'HEAD'] });
    if (head.exitCode !== 0) {
        return false;
    }
    const headSha = head.stdout.trim();
    // pinned commit: no network needed
    if (/^[0-9a-f]{40}$/.test(ref)) {
        return headSha === ref;
    }
    // request peeled entry too, annotated tags point to a tag object
    const res = await run({ ...runOpts, args: ['ls-remote', 'origin', ref, `${ref}^{}`] });
    if (res.exitCode !== 0) {
        return false;
    }
    const remoteRefs = new Map(res.stdout.trim().split('\n').map((line) => {
        const [sha, name] = line.trim().split('\t');
        return [name, sha];
    }));
    // same order as git fetch resolves ref names
    const candidates = [ref, `refs/${ref}`, `refs/tags/${ref}^{}`, `refs/tags/${ref}`, `refs/heads/${ref}`];
    const remoteSha = candidates.map((name) => remoteRefs.get(name)).find((sha) => sha !== undefined);
    return remoteSha === headSha;
}

export async function updateSubmodules(
    options: { url: string; dir: string; ref: string; sync?: boolean; verbose?: boolean },
): Promise<boolean> {
    const { url, dir, ref, sync = false, verbose = false } = options;
    const repoDir = getDir(dir, url, ref);
    // 'git submodule' is a slow shell script on Windows, skip if not needed
    if (!util.fileExists(`${repoDir}/.gitmodules`)) {
        return true;
    }
    if (sync && (await run({ args: ['submodule', 'sync', '--recursive'], cwd: repoDir, showCmd: verbose })).exitCode !== 0) {
        return false;
    }
    if (
        (await run({ args: ['submodule', 'update', '--init', '--recursive', '--depth=1'], cwd: repoDir, showCmd: verbose }))
            .exitCode !== 0
    ) {
        return false;
    }
    return true;
}
