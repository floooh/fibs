import { Command, Config, log, proj, Project } from '../../mod.ts';

export const build: Command = {
    name: 'build',
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
    // FIXME: lookup config
    const config: Config = {
        name: 'fixme-config',
        platform: 'macos',
    };
    const adapter = project.adapters['cmake'];
    await proj.build(project, config, adapter);
}
