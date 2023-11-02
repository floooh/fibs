import { CommandDesc, log, Project, util } from '../../mod.ts';
import * as colors from '$std/fmt/colors.ts'

export const helpCmd: CommandDesc = { name: 'help', help, run };

function help() {
    log.helpCmd([
        'help',
        'help [cmd]',
    ], 'print help for all commands or a specific command');
}

async function run(project: Project) {
    if (Deno.args.length === 1) {
        log.print(`${colors.blue('Floh\'s Infernal Build System!')}`);
        log.print('https://github.com/floooh/fibs\n');
        for (const cmd of project.commands) {
            cmd.help();
        }
    } else {
        const cmdName = Deno.args[1];
        const cmd = util.find(cmdName, project.commands);
        if (cmd !== undefined) {
            cmd.help();
        } else {
            log.error(`unknown command ${cmdName} (run 'fibs help')`);
        }
    }
}
