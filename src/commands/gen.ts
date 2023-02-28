import { CommandDesc, Config, log, proj, Project } from '../../mod.ts';

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
    // FIXME: lookup config
    // FIXME: lookup adapter
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
    await proj.generate(project, config, adapter);
}
