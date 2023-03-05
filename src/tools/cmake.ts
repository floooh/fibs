import { BuildType, Config, log, Project, RunOptions, RunResult, ToolDesc, util } from '../../mod.ts';

export const cmake: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for building projects',
    exists: exists,
};

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.runCmd('cmake', options);
    } catch (err) {
        log.error(`Failed running cmake with: ${err.message}`);
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

export async function configure(project: Project, config: Config) {
    const args = ['--preset', config.name, '-B', util.buildDir(project, config)];
    const res = await run({ args, stderr: 'piped' });
    if (res.exitCode !== 0) {
        log.error(
            `cmake returned with exit code ${res.exitCode}, stderr:\n\n${res.stderr}`,
        );
    }
}

export type BuildOptions = {
    target?: string;
    cleanFirst?: boolean;
    buildType?: BuildType;
};

export async function build(project: Project, config: Config, options: BuildOptions) {
    let args = ['--build'];
    if (options.buildType !== undefined) {
        args = [...args, '--preset', config.name];
    } else {
        args = [...args, util.buildDir(project, config)];
    }
    if (options.target !== undefined) {
        args = [...args, '--target', options.target];
    }
    if (options.cleanFirst === true) {
        args = [...args, '--clean-first'];
    }
    const res = await run({ args });
    if (res.exitCode !== 0) {
        log.error('build failed.');
    }
}
