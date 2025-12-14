import { host, log, proj, Project, ProjectDesc, util } from '../index.ts';

import { commands } from './commands/index.ts';
import { tools } from './tools/index.ts';
import { adapters } from './adapters/index.ts';
import { configs } from './configs/index.ts';
import { runners } from './runners/index.ts';
import { openers } from './openers/index.ts';

let rootProject: Project;

export async function main() {
    if (Deno.args.length < 1) {
        log.print('run \'fibs help\' for more info');
        Deno.exit(10);
    }
    // special 'reset' command to wipe .fibs directory (useful when imports are broken)
    const cwd = Deno.cwd().replaceAll('\\', '/');
    const rootPath = `${cwd}/fibs.ts`;
    let skipCmd = false;
    if (Deno.args[0] === 'reset') {
        skipCmd = true;
        await util.find('reset', commands)!.run(null as unknown as Project);
    }
    try {
        // try to import a fibs.ts file from current directory
        if (!util.fileExists(rootPath)) {
            log.panic('current directory is not a fibs project (no fibs.ts found)');
        }
        const rootModule = await import(`file://${rootPath}`);
        if (rootModule.project !== undefined) {
            // setup the root project tree
            rootProject = await proj.setup(cwd, rootModule.project, stdDesc);
            // lookup and run subcommand
            const cmdName = Deno.args[0];
            const cmd = util.find(cmdName, rootProject.commands);
            if (cmd !== undefined) {
                if (!skipCmd) {
                    await cmd.run(rootProject);
                }
            } else {
                log.panic(`command '${cmdName}' not found in project '${rootProject.name}', run 'fibs help'`);
            }
        } else {
            log.panic('file \'fibs.ts\' in current directory has no export \'project\'');
        }
    } catch (err) {
        log.panic(err);
    }
}

function hostDefaultConfig(): string {
    switch (host.platform()) {
        case 'macos':
            return 'macos-make-release';
        case 'windows':
            return 'win-vstudio-release';
        case 'linux':
            return 'linux-make-release';
    }
}

const stdDesc: ProjectDesc = {
    name: 'std',
    commands,
    tools,
    adapters,
    configs,
    runners,
    openers,
    cmakeVariables: {
        CMAKE_C_STANDARD: '99',
        CMAKE_CXX_STANDARD: '11',
    },
    settings: {
        config: {
            default: hostDefaultConfig(),
            value: hostDefaultConfig(),
            validate: (project, value) => {
                return { valid: util.find(value, project.configs) !== undefined, hint: 'run \'fibs list configs\'' };
            },
        },
    },
};
