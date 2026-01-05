import { log } from '../lib/index.ts';
import type { CommandDesc, Project } from '../types.ts';
import { colors } from '../deps.ts';

export const helpCmd: CommandDesc = { name: 'help', help, run };

function help() {
    log.helpCmd([
        'help',
        'help [cmd]',
    ], 'print help for all commands or a specific command');
}

async function run(project: Project, args: string[]) {
    if (args.length === 1) {
        log.print(`${colors.blue("Floh's Infernal Build System!")}`);
        log.print('https://github.com/floooh/fibs');
        for (const cmd of project.commands()) {
            cmd.help();
        }
        log.print(`\n${colors.brightBlue('[note]')} run any command with --verbose for more detailed output\n`);
    } else {
        const cmdName = args[1];
        project.command(cmdName).help();
    }
}
