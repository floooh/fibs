import { Project, ProjectDesc } from './types.ts';
import * as cmd from './cmd.ts';
import * as log from './log.ts';
import * as proj from './proj.ts';
import * as util from './util.ts';
import * as host from './host.ts';

import { commands } from './commands/index.ts';
import { tools } from './tools/index.ts';
import { adapters } from './adapters/index.ts';

const stdDesc: ProjectDesc = {
    name: 'std',
    commands,
    tools,
    adapters,
    settings: {
        config: util.defaultConfigForPlatform(host.platform()),
    },
};

let rootProject: Project;

export async function run(importMeta: any, desc: ProjectDesc) {
    if (importMeta.main) {
        // 'root project mode'
        if (Deno.args.length < 1) {
            log.print('run \'fibs help\' for more info');
            Deno.exit(10);
        }
        rootProject = await proj.setup(importMeta, desc, stdDesc);
        await cmd.run(rootProject, Deno.args[0]);
    } else {
        // 'dependency mode'
        console.error('FIXME: implement dependency mode');
    }
}
