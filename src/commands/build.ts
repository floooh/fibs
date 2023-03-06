import { AdapterOptions, CommandDesc, log, proj, Project, util } from '../../mod.ts';

export const build: CommandDesc = {
    help: help,
    run: run,
};

function help() {
    log.help([
        'build',
        'build [--rebuild]',
        'build [target]',
        'build [target] [--rebuild]',
    ], 'build all targets or a specific target');
}

async function run(project: Project) {
    const adapter = project.adapters['cmake'];
    const config = util.activeConfig(project);
    const options: AdapterOptions = {};
    for (let i = 1; i < Deno.args.length; i++) {
        const arg = Deno.args[i];
        if (arg.startsWith('--')) {
            if (arg === '--rebuild') {
                options.forceRebuild = true;
            } else {
                log.error(`unknown option '${arg}, type 'fibs help build'`);
            }
        } else {
            if (project.targets[arg] !== undefined) {
                options.buildTarget = arg;
            } else {
                log.error(`unknown build target '${arg}`);
            }
        }
    }
    await proj.build(project, config, adapter, options);
}
