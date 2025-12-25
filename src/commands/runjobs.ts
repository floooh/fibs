import { log, proj } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';

export const runjobsCmd: CommandDesc = { name: 'runjobs', help, run };

function help() {
    log.helpCmd([
        'runjobs',
    ], [
        'runs custom build jobs for all targets (usually invoked by the build process)',
    ]);
}

async function run(project: Project) {
    await Promise.all(project.targets().map((target): Promise<void> => proj.runJobs(project, target)));
}
