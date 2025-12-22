import { log, proj, util } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';

export const openCmd: CommandDesc = { name: 'open', help, run };

function help() {
    log.helpCmd([
        'open',
        'open [config]',
    ], 'open IDE for current or named config');
}

async function run(project: Project) {
    let config;
    if (Deno.args.length <= 1) {
        config = project.activeConfig();
    } else {
        const configName = Deno.args[1];
        config = project.config(configName);
    }
    if (config.opener === undefined) {
        log.panic(`don't know how to open config '${config.name}' (config has undefined runner)`);
    }
    if (!util.dirExists(project.buildDir(config.name))) {
        await proj.generate();
    }
    await config.opener.open(project, config);
}
