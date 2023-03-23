import { CommandDesc, log, proj, Project, util } from '../../mod.ts';

export const runjobsCmd: CommandDesc = { help, run };

function help() {
    log.help([
        'runjobs',
    ], [
        'runs custom build jobs for all targets (usually invoked by the build process)',
    ]);
}

async function run(project: Project) {
    const config = util.activeConfig(project);
    Object.values(project.targets).forEach(async (target) => {
        if (target.jobs.length > 0) {
            log.section(target.name);
            await proj.runJobs(project, config, target);
        }
    });
}
