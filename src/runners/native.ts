import { Config, Project, RunnerDesc, RunOptions, Target, util } from '../../index.ts';

export const nativeRunner: RunnerDesc = { name: 'native', run };

async function run(project: Project, config: Config, target: Target, options: RunOptions) {
    // can assume here that run() will only be called for executable targets
    let path;
    if (config.platform === 'macos' && target.type === 'windowed-exe') {
        path = `${util.distDir(project, config)}/${target.name}.app/Contents/MacOS/${target.name}`;
    } else {
        path = `${util.distDir(project, config)}/${target.name}`;
    }
    const res = await util.runCmd(path, options);
    Deno.exit(res.exitCode);
}
