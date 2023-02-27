import { Command, Config, log, proj, Project } from '../../mod.ts';

export const gen: Command = {
    name: 'gen',
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
    // FIXME: lookup config
    // FIXME: lookup adapter
    const config: Config = {
        name: 'fixme-config',
        platform: 'macos',
    };
    const adapter = project.adapters['cmake'];
    await proj.generate(project, config, adapter);
}
