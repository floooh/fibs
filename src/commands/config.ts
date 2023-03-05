import { CommandDesc, log, Project, settings, proj } from '../../mod.ts';

export const config: CommandDesc = {
    help: help,
    run: run,
};

function help(_project: Project) {
    log.help([
        'config',
        'config [config-name]',
    ], 'get or set active build config');
}

async function run(project: Project) {
    if (Deno.args.length === 1) {
        log.print(settings.get(project, 'config'));
    } else if (Deno.args.length === 2) {
        const configName = Deno.args[1];
        const config = project.configs[configName];
        if (config !== undefined) {
            settings.set(project, 'config', configName);
            const adapter = project.adapters['cmake'];
            await proj.configure(project, config, adapter, {});
        } else {
            log.error(`config '${configName} not found (run 'fibs list configs)`);
        }
    } else {
        log.error("too many args (run 'fibs help config')");
    }
}
