import { runCmd } from '../lib/util.ts';
import type { Config, Project, RunnerDesc, RunOptions, Target } from '../types.ts';

export const nativeRunner: RunnerDesc = { name: 'native', run };

async function run(project: Project, config: Config, target: Target, options: RunOptions) {
    // can assume here that run() will only be called for executable targets
    const path = `${project.targetDistDir(target.name, config.name)}/${target.name}`;
    const res = await runCmd(path, options);
    Deno.exitCode = res.exitCode;
}
