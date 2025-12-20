import { log } from '../lib/index.ts';
import { CommandDesc, Project } from '../types.ts';
import { colors } from '../../deps.ts';

export const helpCmd: CommandDesc = { name: 'help', help, run };

function help() {
    log.helpCmd([
        'help',
        'help [cmd]',
    ], 'print help for all commands or a specific command');
}

async function run(project: Project) {
    if (Deno.args.length === 1) {
        log.print(`${colors.blue("Floh's Infernal Build System!")}`);
        log.print('https://github.com/floooh/fibs\n');
        for (const cmd of project.commands()) {
            cmd.help();
        }
    } else {
        const cmdName = Deno.args[1];
        project.command(cmdName).help();
    }
}
