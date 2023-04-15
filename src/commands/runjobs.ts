import { CommandDesc, log, proj, Project, util } from '../../mod.ts';

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
    for (const target of project.targets) {
        if (target.jobs.length > 0) {
            await proj.runJobs(project, config, target);
        }
    }
}
