import { conf, imports, log, proj, settings } from '../lib/index.ts';
import { CommandDesc, Config, Project } from '../types.ts';

export const configCmd: CommandDesc = { name: 'config', help, run };

function help() {
    log.helpCmd([
        'config [--get]',
        'config [config-name]',
    ], '(re-)configure project, or get current config');
}

async function run(project: Project) {
    if (imports.hasImportErrors(project)) {
        log.panic('import errors detected');
    }
    const args = Deno.args.slice(1).filter((arg) => {
        if (arg.startsWith('--')) {
            if (arg === '--get') {
                log.print(project.activeConfig().name);
            } else {
                log.panic(`unknown option '${arg} (run 'fibs help config')`);
            }
            Deno.exit(0);
        }
        return true;
    });
    if (args.length > 1) {
        log.panic('too many args (run \'fibs help config\')');
    }
    let config: Config;
    if (args.length > 0) {
        config = project.config(args[0]);
    } else {
        config = project.activeConfig();
    }
    await conf.validate(project, config, { silent: false, abortOnError: true });
    settings.set(project, 'config', config.name);
    await proj.configure(project, config, project.adapter('cmake'), {});
}
