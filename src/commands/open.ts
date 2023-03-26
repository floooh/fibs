import { CommandDesc, log, proj, Project, util } from '../../mod.ts';

export const openCmd: CommandDesc = { help, run };

function help() {
    log.helpCmd([
        'open',
        'open [config]',
    ], 'open IDE for current or named config');
}

async function run(project: Project) {
    let config;
    if (Deno.args.length <= 1) {
        config = util.activeConfig(project);
    } else {
        const configName = Deno.args[1];
        config = project.configs[configName];
        if (config === undefined) {
            log.error(`unknown config '${configName}' (run 'fibs list configs')`);
        }
    }
    if (config.opener === undefined) {
        log.error(`don't know how to open config '${config.name}' (config has undefined runner)`);
    }
    if (!util.dirExists(util.buildDir(project, config))) {
        const adapter = project.adapters['cmake'];
        await proj.configure(project, config, adapter, {});
    }
    await config.opener.open(project, config);
}
