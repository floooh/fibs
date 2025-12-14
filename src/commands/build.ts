import { CommandDesc, conf, imports, log, proj, Project, util } from '../../index.ts';

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
    const adapter = util.find('cmake', project.adapters)!;
    const config = util.activeConfig(project);
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
            if (util.find(arg, project.targets) !== undefined) {
                buildTarget = arg;
            } else {
                log.panic(`unknown build target '${arg}`);
            }
        }
    }
    await conf.validate(project, config, { silent: false, abortOnError: true });
    await proj.build(project, config, adapter, { forceRebuild, buildTarget });
}
