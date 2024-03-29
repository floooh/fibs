import { CommandDesc, log, Project, util } from '../../mod.ts';

export const runCmd: CommandDesc = { name: 'run', help, run };

function help() {
    log.helpCmd([
        'run [target]',
        'run [target] [target-args]',
    ], 'run an executable build target');
}

async function run(project: Project) {
    if (Deno.args.length <= 1) {
        log.error('no target provided (run \'fibs help run\')');
    }
    const name = Deno.args[1];
    const target = util.find(name, project.targets);
    if (target === undefined) {
        log.error(`unknown target '${name}' (run 'fibs list targets')`);
    }
    if (target.type !== 'plain-exe' && target.type !== 'windowed-exe') {
        log.error(`target '${name}' is not an executable (run 'fibs list targets)`);
    }
    const config = util.activeConfig(project);
    await config.runner.run(project, config, target, {
        args: Deno.args.slice(2),
        cwd: util.distDir(project, config),
    });
}
