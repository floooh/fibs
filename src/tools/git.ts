import { log, RunOptions, RunResult, ToolDesc, util } from '../../mod.ts';

export const git: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for fetching imports',
    exists: exists,
};

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.runCmd('git', options);
    } catch (err) {
        log.error(`Failed running git with: ${err.message}`);
    }
}

export async function exists(): Promise<boolean> {
    try {
        await run({ args: ['--version'], stdout: 'piped', showCmd: false, abortOnError: false });
        return true;
    } catch (_err) {
        return false;
    }
}

export type PullOptions = {
    dir: string,
    force?: boolean,
};

export async function pull(options: PullOptions): Promise<number> {
    const args: string[] = ['pull'];
    if (options.force) {
        args.push('-f');
    }
    const res = await run({ args, cwd: options.dir, showCmd: true });
    return res.exitCode;
}

export type CloneOptions = {
    url: string,
    dir: string,
    name?: string,
    recursive?: boolean,
    depth?: number,
    branch?: string,
};

export async function clone(options: CloneOptions): Promise<number> {
    const args: string[] = ['clone'];
    if (options.recursive) {
        args.push('--recursive');
    }
    if (options.branch !== undefined) {
        args.push('--branch', options.branch, '--single-branch');
    }
    if (options.depth !== undefined) {
        args.push('--depth', `${options.depth}`);
    }
    args.push(options.url);
    if (options.name !== undefined) {
        args.push(options.name);
    }
    const res = await run({ args, cwd: options.dir, showCmd: true });
    return res.exitCode;
}
