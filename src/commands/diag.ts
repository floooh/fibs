import { CommandDesc, conf, host, log, Project } from '../../mod.ts';
import { colors } from '../../deps.ts';

export const diagCmd: CommandDesc = {
    help: help,
    run: run,
};

function help() {
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
    let separator = false;
    if (Deno.args.length === 1) {
        which = all;
        separator = true;
    } else {
        const arg = Deno.args[1];
        if (!all.includes(arg)) {
            log.error(`invalid arg '${arg}', run 'fibs help diag'`);
        }
        which = [arg];
    }
    if (which.includes('fibs')) {
        if (separator) {
            log.section('fibs');
        }
        log.warn('FIXME: diag fibs');
        log.print();
    }
    if (which.includes('tools')) {
        if (separator) {
            log.section('tools');
        }
        await tools(project);
        log.print();
    }
    if (which.includes('configs')) {
        if (separator) {
            log.section('configs');
        }
        await configs(project);
        log.print();
    }
    if (which.includes('imports')) {
        if (separator) {
            log.section('imports');
        }
        log.warn('FIXME: diag imports');
        log.print();
    }
    if (which.includes('project')) {
        if (separator) {
            log.section('project');
        }
        log.dir(project);
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
                res = `${colors.yellow('OPTIONAL, NOT FOUND')} (${tool.notFoundMsg})`;
            } else {
                res = `${colors.red('NOT FOUND')} (${tool.notFoundMsg})`;
            }
            log.print(`${tool.name}:\t${res}`);
        }
    }
}

async function configs(project: Project) {
    const configs = project.configs;
    for (const configName in configs) {
        const config = configs[configName];
        log.write(`${config.name}: `)
        const res = await conf.validate(project, config, { silent: true, abortOnError: false });
        if (res.valid) {
            log.write(colors.green('ok\n'));
        } else {
            log.write(colors.red('FAILED\n'));
            for (const hint of res.hints) {
                log.info(`  ${hint}`);
            }
        }
    }
}
