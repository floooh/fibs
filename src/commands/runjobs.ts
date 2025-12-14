import { CommandDesc, log, proj, Project, util } from '../../index.ts';

export const runjobsCmd: CommandDesc = { name: 'runjobs', help, run };

function help() {
    log.helpCmd([
        'runjobs',
    ], [
        'runs custom build jobs for all targets (usually invoked by the build process)',
    ]);
}

async function run(project: Project) {
    const config = util.activeConfig(project);
    await Promise.all(project.targets.map((target): Promise<void> => proj.runJobs(project, config, target)));
}
