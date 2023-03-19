import { Config, Project, RunnerDesc, RunOptions, Target, util } from '../../mod.ts';
import WASI from 'https://deno.land/std@0.178.0/wasi/snapshot_preview1.ts';

export const wasiRunner: RunnerDesc = {
    run: run,
};

async function run(project: Project, config: Config, target: Target, options: RunOptions) {
    // can assume here that run() will only be called for executable targets
    const path = `${util.distDir(project, config)}/${target.name}.wasm`;
    const context = new WASI({
        args: options.args,
        env: Deno.env.toObject(),
    });
    const binary = await Deno.readFile(path);
    const module = await WebAssembly.compile(binary);
    const instance = await WebAssembly.instantiate(module, { 'wasi_snapshot_preview1': context.exports });
    context.start(instance);
}
