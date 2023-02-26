import { Command, host, log, Project } from '../../mod.ts';
import { colors } from '../../deps.ts';

export const diag: Command = {
    name: 'diag',
    help: help,
    run: run,
};

function help(_project: Project) {
    log.help([
        'diag',
        'diag fibs',
        'diag tools',
        'diag configs',
        'diag imports',
        'diag project',
    ], 'run diagnostics and check for errors');
}

async function run(project: Project) {
    const all: string[] = ['fibs', 'tools', 'configs', 'imports', 'project'];
    let which: string[] = [];
    if (Deno.args.length === 1) {
        which = all;
    } else {
        const arg = Deno.args[1];
        if (!all.includes(arg)) {
            log.error(`invalid arg '${arg}', run 'fibs help diag'`);
        }
        which = [arg];
    }
    if (which.includes('fibs')) {
        log.print(`${colors.yellow('=== fibs:')}`);
        log.warn('FIXME: diag fibs');
        log.print();
    }
    if (which.includes('tools')) {
        log.print(`${colors.yellow('=== tools:')}`);
        await tools(project);
        log.print();
    }
    if (which.includes('configs')) {
        log.print(`${colors.yellow('=== configs:')}`);
        log.warn('FIXME: diag configs');
        log.print();
    }
    if (which.includes('imports')) {
        log.print(`${colors.yellow('=== imports:')}`);
        log.warn('FIXME: diag imports');
        log.print();
    }
    if (which.includes('project')) {
        log.print(`${colors.yellow('=== project:')}`);
        log.print(project);
    }
}

async function tools(project: Project) {
    const tools = project.tools!;
    for (const toolName in tools) {
        const tool = tools[toolName];
        if (tool.platforms.includes(host.platform())) {
            const exists = await tool.exists();
            let res: string;
            if (exists) {
                res = `${colors.green('found')}`;
            } else if (tool.optional) {
                res = `${
                    colors.yellow('OPTIONAL, NOT FOUND')
                } (${tool.notFoundMsg})`;
            } else {
                res = `${colors.red('NOT FOUND')} (${tool.notFoundMsg})`;
            }
            log.print(`${tool.name}:\t${res}`);
        }
    }
}
