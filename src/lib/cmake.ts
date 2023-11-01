import { Config, Project, RunOptions, RunResult } from './types.ts';
import * as util from './util.ts';
import * as log from './log.ts';

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.runCmd('cmake', options);
    } catch (err) {
        log.error(`Failed running cmake with: ${err.message}`);
    }
}

export async function exists(): Promise<boolean> {
    try {
        // NOTE: cannot use local run() function since this would terminate on error!
        await util.runCmd('cmake', { args: ['--version'], stdout: 'piped', showCmd: false, abortOnError: false });
        return true;
    } catch (_err) {
        return false;
    }
}

export async function configure(project: Project, config: Config) {
    if (config.opener !== undefined) {
        await config.opener.configure(project, config);
    }
    const args = ['--preset', config.name, '-B', util.buildDir(project, config)];
    const res = await run({ args, stderr: 'piped' });
    if (res.exitCode !== 0) {
        log.error(
            `cmake returned with exit code ${res.exitCode}, stderr:\n\n${res.stderr}`,
        );
    }
}

export async function build(project: Project, config: Config, options: { target?: string; forceRebuild?: boolean }) {
    const {
        target,
        forceRebuild = false,
    } = options;
    let args = ['--build', '--preset', 'default'];
    if (target !== undefined) {
        args = [...args, '--target', target];
    }
    if (forceRebuild) {
        args = [...args, '--clean-first'];
    }
    const res = await run({ args });
    if (res.exitCode !== 0) {
        log.error('build failed.');
    }
}
