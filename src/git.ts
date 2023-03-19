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
    dir: string,
    force?: boolean,
    ref?: string,
    showCmd?: boolean,
};

export async function pullOrFetch(options: PullOptions): Promise<boolean> {
    const {
        dir,
        ref,
        force = false,
        showCmd = true
    } = options;
    const args: string[] = [];
    if (ref === undefined) {
        args.push('pull');
    } else {
        args.push('fetch');
    }
    if (force) {
        args.push('-f');
    }
    if ((await run({ args, cwd: dir, showCmd })).exitCode !== 0) {
        return false;
    }
    if (ref === undefined) {
        return await updateSubmodules({ dir, showCmd });
    } else {
        return await checkout({ dir, ref, showCmd });
    }
}

export type CloneOptions = {
    url: string,
    dir: string,
    name: string,
    depth?: number,
    branch?: string,
    ref?: string,
    showCmd?: boolean,
};

export async function clone(options: CloneOptions): Promise<boolean> {
    const {
        url,
        dir,
        name,
        depth,
        branch,
        ref,
        showCmd = true,
    } = options;
    const args: string[] = ['clone', '--recursive'];
    if (branch !== undefined) {
        args.push('--branch', branch, '--single-branch');
    }
    if (depth !== undefined) {
        args.push('--depth', `${depth}`);
    }
    args.push(url);
    if (name !== undefined) {
        args.push(name);
    }
    if ((await run({ args, cwd: dir, showCmd })).exitCode !== 0) {
        return false;
    }
    const repoDir = `${dir}/${name}`;
    if (ref === undefined) {
        return await updateSubmodules({ dir: repoDir, showCmd });
    } else {
        return await checkout({ dir: repoDir, ref, showCmd });
    }
}

export type CheckoutOptions = {
    dir: string;
    ref: string;
    showCmd?: boolean,
};

export async function checkout(options: CheckoutOptions): Promise<boolean> {
    const { dir, ref, showCmd = true } = options;
    const res = await run({
        args: ['-c', 'advice.detachedHead=false', 'checkout', ref],
        cwd: dir,
        showCmd,
    });
    if (res.exitCode !== 0) {
        return false;
    }
    return await updateSubmodules({ dir, showCmd });
}

export type UpdateSubmodulesOptions = {
    dir: string,
    showCmd?: boolean,
};

export async function updateSubmodules(options: UpdateSubmodulesOptions): Promise<boolean> {
    const { dir, showCmd = true } = options;
    let res = await run({ args: ['submodule', 'sync', '--recursive'], cwd: dir, showCmd });
    if (res.exitCode !== 0) {
        return false;
    }
    res = await run({ args: ['submodule', 'update', '--recursive'], cwd: dir, showCmd });
    if (res.exitCode !== 0) {
        return false;
    }
    return true;
}

export type HasUncommittedChangesOptions = {
    dir: string,
    showCmd?: boolean;
};

export async function hasUncommittedChanges(options: HasUncommittedChangesOptions): Promise<boolean> {
    const { dir, showCmd = true } = options;
    const res = await run({ args: ['status', '-s'], cwd: dir, showCmd, stdout: 'piped' });
    return 0 !== res.stdout.length;
}

export type HasUnpushedChangesOptions = {
    dir: string,
    showCmd?: boolean,
};

export async function hasUnpushedChanges(options: HasUnpushedChangesOptions): Promise<boolean> {
    const { dir, showCmd = true } = options;
    const res = await run({
        args: ['log', '--branches', '--not', '--remotes', '--oneline' ],
        cwd: dir,
        showCmd,
        stdout: 'piped'
    });
    return 0 !== res.stdout.length;
}
