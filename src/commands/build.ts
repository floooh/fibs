import { conf, imports, log, proj } from '../lib/index.ts';
import { CommandDesc, Project } from '../types.ts';

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
    const config = project.activeConfig();
    let forceRebuild;
    let buildTarget;
    for (let i = 1; i < Deno.args.length; i++) {
        const arg = Deno.args[i];
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
    await conf.validate(project, config, { silent: false, abortOnError: true });
    await proj.build({ forceRebuild, buildTarget });
}
