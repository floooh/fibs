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

export async function main() {
    if (Deno.args.length < 1) {
        log.print('run \'fibs help\' for more info');
        Deno.exit(10);
    }
    try {
        // try to import a fibs.ts file from current directory
        const cwd = Deno.cwd().replaceAll('\\', '/');
        const rootPath = `${cwd}/fibs.ts`;
        if (!util.fileExists(rootPath)) {
            log.error("current directory is not a fibs project (no fibs.ts found)");
        }
        const rootModule = await import(`file://${rootPath}`);
        if (rootModule.projectDesc !== undefined) {
            // setup the root project tree
            rootProject = await proj.setup(cwd, rootModule.projectDesc, stdDesc);
            // lookup and run subcommand
            const cmd = Deno.args[0];
            if (rootProject.commands[cmd] !== undefined) {
                await rootProject.commands[cmd].run(rootProject);
            } else {
                log.error(
                    `command '${cmd}' not found in project '${rootProject.name}', run 'fibs help'`,
                );
            }
        } else {
            log.error("file 'fibs.ts' in current directory has no export 'projectDesc'");
        }
    } catch (err) {
        log.error(err);
    }
}

const stdDesc: ProjectDesc = {
    name: 'std',
    commands,
    tools,
    adapters,
    configs,
    variables: {
        CMAKE_C_STANDARD: '99',
        CMAKE_CXX_STANDARD: '11',
    },
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
