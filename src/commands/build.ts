import { CommandDesc, log, proj, util, Project } from '../../mod.ts';

export const build: CommandDesc = {
    help: help,
    run: run,
};

function help(_project: Project) {
    log.help([
        'build',
        'build [config]',
        'build [config] [build tool args]',
    ], 'build current or specific config');
}

async function run(project: Project) {
    const adapter = project.adapters['cmake'];
    const config = util.activeConfig(project);
    await proj.build(project, config, adapter);
}
