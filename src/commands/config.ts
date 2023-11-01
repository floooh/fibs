import { CommandDesc, conf, Config, imports, log, proj, Project, settings, util } from '../../mod.ts';

export const configCmd: CommandDesc = { name: 'config', help, run };

function help() {
    log.helpCmd([
        'config [--get]',
        'config [config-name]',
    ], '(re-)configure project, or get current config');
}

async function run(project: Project) {
    if (imports.hasImportErrors(project)) {
        log.error('import errors detected');
    }
    const args = Deno.args.slice(1).filter((arg) => {
        if (arg.startsWith('--')) {
            if (arg === '--get') {
                log.print(util.activeConfig(project).name);
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
    let config: Config | undefined;
    if (args.length > 0) {
        config = util.find(args[0], project.configs);
        if (config === undefined) {
            log.error(`config '${args[0]} not found (run 'fibs list configs)`);
        }
    } else {
        config = util.activeConfig(project);
    }
    await conf.validate(project, config, { silent: false, abortOnError: true });
    settings.set(project, 'config', config.name);
    const adapter = util.find('cmake', project.adapters)!;
    await proj.configure(project, config, adapter, {});
}
