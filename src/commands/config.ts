import { conf, imports, log, proj, settings } from '../lib/index.ts';
import type { CommandDesc, Config, Project } from '../types.ts';

export const configCmd: CommandDesc = { name: 'config', help, run };

function help() {
    log.helpCmd([
        'config [--get]',
        'config [config-name]',
    ], '(re-)configure project, or get current config');
}

async function run(project: Project, args: string[]) {
    if (imports.hasImportErrors(project)) {
        throw new Error('import errors detected');
    }
    args = args.slice(1).filter((arg) => {
        if (arg.startsWith('--')) {
            if (arg === '--get') {
                log.print(project.activeConfig().name);
                Deno.exit(0);
            } else {
                throw new Error(`unknown option '${arg} (run 'fibs help config')`);
            }
        }
        return true;
    });
    if (args.length > 1) {
        throw new Error("too many args (run 'fibs help config')");
    }
    let config: Config;
    if (args.length > 0) {
        config = project.config(args[0]);
    } else {
        config = project.activeConfig();
    }
    await conf.validate(project, config, { silent: false, abortOnError: true });
    settings.set(project, 'config', config.name);
    await proj.generate(config);
}
