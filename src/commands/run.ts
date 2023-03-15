import { CommandDesc, host, http, log, Project, util } from '../../mod.ts';
import WASI from 'https://deno.land/std@0.178.0/wasi/snapshot_preview1.ts';

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
    if ((config.platform === 'macos') && (target.type === 'windowed-exe')) {
        util.runCmd('open', { args: [`${path}.app`] });
    } else if (config.platform === 'emscripten') {
        const url = `http://localhost:8080/${target.name}.html`;
        switch (host.platform()) {
            case 'macos':
                util.runCmd('open', { args: [url] });
                break;
            case 'linux':
                util.runCmd('xdg-open', { args: [url] });
                break;
            case 'windows':
                util.runCmd('cmd', { args: ['/c', 'start', url] });
                break;
        }
        await http.serve({ target: dir, port: '8080' });
    } else if (config.platform === 'wasi') {
        const wasmPath = path + '.wasm';
        const context = new WASI({
            args: Deno.args.slice(2),
            env: Deno.env.toObject(),
        });
        const binary = await Deno.readFile(wasmPath);
        const module = await WebAssembly.compile(binary);
        const instance = await WebAssembly.instantiate(module, { 'wasi_snapshot_preview1': context.exports });
        context.start(instance);
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
