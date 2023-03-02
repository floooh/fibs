import { Project, ProjectDesc } from './types.ts';
import * as log from './log.ts';
import * as proj from './proj.ts';
import * as util from './util.ts';
import * as host from './host.ts';

import { commands } from './commands/index.ts';
import { tools } from './tools/index.ts';
import { adapters } from './adapters/index.ts';
import { configs } from './configs/index.ts';

let rootProject: Project;

export async function run(importMeta: any, desc: ProjectDesc) {
    if (importMeta.main) {
        // 'root project mode'
        if (Deno.args.length < 1) {
            log.print('run \'fibs help\' for more info');
            Deno.exit(10);
        }
        rootProject = await proj.setup(importMeta, desc, stdDesc);
        // find and run command
        const cmd = Deno.args[0];
        try {
            if (rootProject.commands![cmd] !== undefined) {
                await rootProject.commands![cmd].run(rootProject);
            } else {
                log.error(
                    `command '${cmd}' not found in project '${rootProject.name}', run 'fibs help'`,
                );
            }
        } catch (err) {
            log.error(err);
        }
    } else {
        // 'dependency mode'
        console.error('FIXME: implement dependency mode');
    }
}

const stdDesc: ProjectDesc = {
    name: 'std',
    commands,
    tools,
    adapters,
    configs,
    settings: {
        config: {
            default: util.defaultConfigForPlatform(host.platform()),
            value: util.defaultConfigForPlatform(host.platform()),
            validate: (project, value) => {
                return { valid: project.configs[value] !== undefined, hint: 'run \'fibs list configs\'' };
            },
        },
    },
};
