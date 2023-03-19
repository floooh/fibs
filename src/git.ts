import { RunOptions, RunResult } from './types.ts';
import * as util from './util.ts';
import * as log from './log.ts';

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
    dir: string;
    force?: boolean;
};

export async function pull(options: PullOptions): Promise<boolean> {
    const args: string[] = ['pull'];
    if (options.force) {
        args.push('-f');
    }
    const res = await run({ args, cwd: options.dir, showCmd: true });
    return res.exitCode === 0;
}

export type CloneOptions = {
    url: string;
    dir: string;
    name?: string;
    recursive?: boolean;
    depth?: number;
    branch?: string;
};

export async function clone(options: CloneOptions): Promise<boolean> {
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
    return res.exitCode === 0;
}

export type CheckoutOptions = {
    dir: string;
    ref: string;
};

export async function checkout(options: CheckoutOptions): Promise<boolean> {
    const res = await run({
        args: ['-c', 'advice.detachedHead=false', 'checkout', options.ref],
        cwd: options.dir,
        showCmd: true,
    });
    if (res.exitCode !== 0) {
        return false;
    }
    return await updateSubmodules(options.dir);
}

export async function updateSubmodules(dir: string): Promise<boolean> {
    let res = await run({ args: ['submodule', 'sync', '--recursive'], cwd: dir, showCmd: true });
    if (res.exitCode !== 0) {
        return false;
    }
    res = await run({ args: ['submodule', 'update', '--recursive'], cwd: dir, showCmd: true });
    if (res.exitCode !== 0) {
        return false;
    }
    return true;
}

export async function hasLocalChanges(dir: string): Promise<boolean> {
    let res = await run({ args: ['status', '-s'], cwd: dir, showCmd: false, stdout: 'piped' });
    return 0 !== res.stdout.length;
}

type CheckOutOfSyncResult = {
    valid: boolean;
    hints: string[];
}

export async function checkOutOfSync(dir: string): Promise<CheckOutOfSyncResult> {
    const res: CheckOutOfSyncResult = { valid: true, hints: [] };
    if (await hasLocalChanges(dir)) {
        res.valid = false;
        res.hints.push(`local changes detected in ${dir}`);
    }
    return res;
}
