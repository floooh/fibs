import { log } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';

export const runCmd: CommandDesc = { name: 'run', help, run };

function help() {
    log.helpCmd([
        'run [target]',
        'run [target] [target-args]',
    ], 'run an executable build target');
}

async function run(project: Project, args: string[]) {
    if (args.length <= 1) {
        log.panic("no target provided (run 'fibs help run')");
    }
    const name = args[1];
    const target = project.target(name);
    if (target.type !== 'plain-exe' && target.type !== 'windowed-exe') {
        log.panic(`target '${name}' is not an executable (run 'fibs list targets)`);
    }
    const config = project.activeConfig();
    await config.runner.run(project, config, target, {
        args: args.slice(2),
        cwd: project.distDir(config.name),
    });
}
