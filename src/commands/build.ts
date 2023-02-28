import { CommandDesc, Config, log, proj, Project } from '../../mod.ts';

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
    // FIXME: lookup config
    const config: Config = {
        name: 'fixme-config',
        generator: null,
        arch: 'arm64',
        platform: 'macos',
        toolchain: null,
        variables: {},
        environment: {},
    };
    const adapter = project.adapters['cmake'];
    await proj.build(project, config, adapter);
}
