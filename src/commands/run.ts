import { CommandDesc, log, Project, util } from '../../mod.ts';

export const runCmd: CommandDesc = {
    help: help,
    run: runFn,
};

function help() {
    log.help([
        'run [target]',
        'run [target] [target-args]',
    ], 'run an executable build target');
}

async function runFn(project: Project) {
    if (Deno.args.length <= 1) {
        log.error('no target provided (run \'fibs help run\')');
    }
    const name = Deno.args[1];
    if (project.targets[name] === undefined) {
        log.error(`unknown target '${name}' (run 'fibs list targets')`);
    }
    const target = project.targets[name];
    if (target.type !== 'plain-exe' && target.type !== 'windowed-exe') {
        log.error(`target '${name}' is not an executable (run 'fibs list targets)`);
    }
    const config = util.activeConfig(project);
    const runner = project.runners[config.runner];
    if (runner === undefined) {
        log.error(`unknown runner '${config.runner}' in config '${config.name} (run 'fibs list runners)`);
    }
    await runner.run(project, config, target, {
        args: Deno.args.slice(2),
        cwd: util.distDir(project, config),
    });
}
