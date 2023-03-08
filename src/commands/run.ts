import { CommandDesc, log, Project, util, http, host } from '../../mod.ts';

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
    const dir = util.distDir(project, config);
    const path = `${dir}/${target.name}`;
    if (config.platform === 'emscripten') {
        const url = `http://localhost:8080/${target.name}.html`;
        switch (host.platform()) {
            case 'macos':
                util.runCmd('open', { args: [ url ] });
                break;
            case 'linux':
                util.runCmd('xdg-open', { args: [ url ] });
                break;
            case 'windows':
                util.runCmd('cmd', { args: [ '/c', 'start', url ]});
                break;
        }
        await http.serve({ target: dir, port: '8080' });
    } else if (config.platform === 'wasi') {
        log.error('FIXME: implement run for wasi');
    } else if (config.platform === 'android') {
        log.error('FIXME: implement run for Android');
    } else {
        const res = await util.runCmd(path, {
            args: Deno.args.slice(2),
            cwd: dir,
            showCmd: false,
        });
        Deno.exit(res.exitCode);
    }
}
