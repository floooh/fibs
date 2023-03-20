import { CommandDesc, conf, log, proj, Project, settings, util } from '../../mod.ts';

export const configCmd: CommandDesc = {
    help: help,
    run: run,
};

function help() {
    log.help([
        'config [--get]',
        'config [config-name]',
    ], '(re-)configure project, or get current config');
}

async function run(project: Project) {
    let config = util.activeConfig(project);
    const args = Deno.args.slice(1).filter((arg) => {
        if (arg.startsWith('--')) {
            if (arg === '--get') {
                log.print(config.name);
            } else {
                log.error(`unknown option '${arg} (run 'fibs help config')`);
            }
            Deno.exit(0);
        }
        return true;
    });
    if (args.length > 1) {
        log.error('too many args (run \'fibs help config\')');
    }
    if (args.length > 0) {
        config = project.configs[args[0]];
        if (config === undefined) {
            log.error(`config '${args[0]} not found (run 'fibs list configs)`);
        }
    }
    await conf.validate(project, config, { silent: false, abortOnError: true });
    settings.set(project, 'config', config.name);
    const adapter = project.adapters['cmake'];
    await proj.configure(project, config, adapter, {});
}
