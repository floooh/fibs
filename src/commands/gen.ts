import { Command, Project, Config, Platform, log, proj } from '../../mod.ts';

export const gen: Command = {
    name: 'gen',
    help: help,
    run: run,
};

function help(_project: Project) {
    log.help([
        'gen',
        'gen [config]',
        'gen [config] [adapter]'
    ], 'generate build files for current of specific build config');
}

async function run(project: Project) {
    // FIXME: lookup config
    // FIXME: lookup adapter
    const config: Config = {
        name: 'fixme-config',
        platform: Platform.Macos,
    }
    const adapter = project.adapters['cmake'];
    proj.generate(project, config, adapter);
}
