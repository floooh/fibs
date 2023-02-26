import { ProjectDesc } from './types.ts';
import * as cmd from './cmd.ts';
import * as log from './log.ts';
import * as proj from './proj.ts';

import { commands } from './commands/index.ts';
import { tools } from './tools/index.ts';
import { adapters } from './adapters/index.ts';

const stdDesc: ProjectDesc = {
    name: 'std',
    commands,
    tools,
    adapters,
};

export async function run(importMeta: any, desc: ProjectDesc) {
    if (!importMeta.main) {
        return;
    }
    if (Deno.args.length < 1) {
        log.print('run \'fibs help\' for more info');
        Deno.exit(10);
    }
    const project = await proj.setup(importMeta, desc, stdDesc);
    await cmd.run(project, Deno.args[0]);
}
