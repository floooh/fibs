import { log, proj } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';

export const runjobsCmd: CommandDesc = { name: 'runjobs', help, run };

function help() {
    log.helpCmd([
        'runjobs',
        'runjobs [config]',
    ], [
        'runs custom build jobs for all targets (usually invoked by the build process)',
    ]);
}

async function run(project: Project, args: string[]) {
    let config;
    if (args.length <= 1) {
        config = project.activeConfig();
    } else {
        const configName = args[1];
        config = project.config(configName);
    }
    await proj.configureTargets(config);
    await Promise.all(project.targets().map((target): Promise<void> => proj.runJobs(project, config, target)));
}
