import { Config, log, Project, RunOptions, RunResult, ToolDesc, util } from '../../mod.ts';

export const cmake: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for building projects',
    exists: exists,
};

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.run('cmake', options);
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
    const buildDir = util.ensureBuildDir(project, config);
    const args = [];
    // FIXME: change this to a cmake preset name
    if (config.generator) {
        args.push(`-G${config.generator}`);
    }
    args.push(project.dir);
    const res = await run({ args, cwd: buildDir, stderr: 'piped' });
    if (res.exitCode !== 0) {
        log.error(
            `cmake returned with exit code ${res.exitCode}, stderr:\n\n${res.stderr}`,
        );
    }
}

export async function build(project: Project, config: Config) {
    const buildDir = util.buildDir(project, config);
    const res = await run({ args: ['--build', '.'], cwd: buildDir });
    if (res.exitCode !== 0) {
        log.error('build failed.');
    }
}
