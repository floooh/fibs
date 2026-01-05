import { util } from './index.ts';
import type { Config, Project, RunOptions, RunResult } from '../types.ts';

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.runCmd('cmake', options);
    } catch (err) {
        throw new Error('Failed running cmake', { cause: err });
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

export async function generate(project: Project, config: Config) {
    if (config.opener !== undefined) {
        await config.opener.generate(project, config);
    }
    const args = ['--preset', config.name, '-B', project.buildDir(config.name)];
    const res = await run({ args, stderr: 'piped', stdout: 'piped' });
    if (res.exitCode !== 0) {
        throw new Error(`cmake returned with exit code ${res.exitCode}, stderr:\n\n${res.stderr}`);
    }
}

export async function build(options: { target?: string; forceRebuild?: boolean }) {
    const {
        target,
        forceRebuild = false,
    } = options;
    let args = ['--build', '--preset', 'default', '--parallel'];
    if (target !== undefined) {
        args = [...args, '--target', target];
    }
    if (forceRebuild) {
        args = [...args, '--clean-first'];
    }
    const res = await run({ args });
    if (res.exitCode !== 0) {
        throw new Error('build failed.');
    }
}
