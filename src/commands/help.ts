import { CommandDesc, log, Project } from '../../mod.ts';
import { colors } from '../../deps.ts';

export const helpCmd: CommandDesc = {
    help: helpFn,
    run: run,
};

function helpFn() {
    log.help([
        'help',
        'help [cmd]',
    ], 'print help for all commands or a specific command');
}

async function run(project: Project) {
    const cmds = project.commands!;
    if (Deno.args.length === 1) {
        log.print(`${colors.blue('Floh\'s Infernal Build System!')}`);
        log.print('https://github.com/floooh/fibs\n');
        for (const cmdName in cmds) {
            const cmd = cmds[cmdName];
            cmd.help(project);
        }
    } else {
        const cmdName = Deno.args[1];
        if (cmdName in cmds) {
            const cmd = cmds[cmdName];
            cmd.help(project);
        }
    }
}
