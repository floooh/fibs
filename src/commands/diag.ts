import { conf, host, imports, log, proj } from '../lib/index.ts';
import { CommandDesc, Project } from '../types.ts';
import { colors } from '../../deps.ts';

export const diagCmd: CommandDesc = { name: 'diag', help, run };

function help() {
    log.helpCmd([
        'diag',
        'diag fibs',
        'diag tools',
        'diag configs',
        'diag targets',
        'diag imports',
        'diag project',
    ], 'run diagnostics and check for errors');
}

async function run(project: Project) {
    const all: string[] = ['fibs', 'tools', 'configs', 'targets', 'imports', 'project'];
    let which: string[] = [];
    let separator = false;
    if (Deno.args.length === 1) {
        which = all;
        separator = true;
    } else {
        const arg = Deno.args[1];
        if (!all.includes(arg)) {
            log.panic(`invalid arg '${arg}', run 'fibs help diag'`);
        }
        which = [arg];
    }
    const diag = async (name: string, func: (project: Project) => Promise<void>) => {
        if (which.includes(name)) {
            if (separator) {
                log.section(name);
            }
            await func(project);
            log.print();
        }
    };
    await diag('fibs', diagFibs);
    await diag('tools', diagTools);
    await diag('configs', diagConfigs);
    await diag('targets', diagTargets);
    await diag('imports', diagImports);
    await diag('project', diagProject);
}

async function diagFibs() {
    log.warn('FIXME: diag fibs');
}

async function diagTools(project: Project) {
    for (const tool of project.tools()) {
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

async function diagConfigs(project: Project) {
    for (const config of project.configs()) {
        log.write(`${config.name}: `);
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

async function diagTargets(project: Project) {
    for (const target of project.targets()) {
        log.write(`${target.name} (${target.type}): `);
        const res = proj.validateTarget(project, target, project.activeConfig(), { silent: true, abortOnError: false });
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

async function diagImports(project: Project) {
    for (const imp of project.imports()) {
        log.write(`${imp.name}: `);
        const res = await imports.validate(project, imp, { silent: true, abortOnError: false });
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

async function diagProject(project: Project) {
    log.dir(project);
}
