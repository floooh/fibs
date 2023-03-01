import { CommandDesc, log, proj, util, Project } from '../../mod.ts';

export const gen: CommandDesc = {
    help: help,
    run: run,
};

function help(_project: Project) {
    log.help([
        'gen',
        'gen [config]',
        'gen [config] [adapter]',
    ], 'generate build files for current of specific build config');
}

async function run(project: Project) {
    const adapter = project.adapters['cmake'];
    const config = util.activeConfig(project);
    await proj.generate(project, config, adapter);
}
