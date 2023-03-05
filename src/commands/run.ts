import { CommandDesc, log, Project, util } from '../../mod.ts';

export const run: CommandDesc = {
    help: help,
    run: runFn,
};

function help(_project: Project) {
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
    const dir = util.distDir(project, util.activeConfig(project));
    const path = `${dir}/${target.name}`;
    const res = await util.runCmd(path, {
        args: Deno.args.slice(2),
        cwd: dir,
        showCmd: false,
    });
    Deno.exit(res.exitCode);
}
