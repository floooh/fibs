import { conf, imports, log, proj } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';

export const buildCmd: CommandDesc = { name: 'build', help, run };

function help() {
    log.helpCmd([
        'build',
        'build [--rebuild]',
        'build [target]',
        'build [target] [--rebuild]',
    ], 'build all targets or a specific target');
}

async function run(project: Project) {
    if (imports.hasImportErrors(project)) {
        log.panic('import errors detected');
    }
    let forceRebuild = false;
    let buildTarget;
    for (const arg of Deno.args.slice(1)) {
        if (arg.startsWith('--')) {
            if (arg === '--rebuild') {
                forceRebuild = true;
            } else {
                log.panic(`unknown option '${arg}, type 'fibs help build'`);
            }
        } else {
            buildTarget = project.target(arg).name;
        }
    }
    await proj.configureTargets();
    await conf.validate(project, project.activeConfig(), { silent: false, abortOnError: true });
    await proj.build({ forceRebuild, buildTarget });
}
