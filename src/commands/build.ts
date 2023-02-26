import { Command, Project, Config, Platform, log, proj } from '../../mod.ts';

export const build: Command = {
    name: 'build',
    help: help,
    run: run,
};

function help(_project: Project) {
    log.help([
        'build',
        'build [config]',
        'build [config] [build tool args]'
    ], 'build current or specific config');
}

async function run(project: Project) {
    // FIXME: lookup config
    const config: Config = {
        name: 'fixme-config',
        platform: Platform.Macos,
    };
    const adapter = project.adapters['cmake'];
    await proj.build(project, config, adapter);
}
