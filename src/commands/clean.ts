import { CommandDesc, Config, log, Project, util } from '../../mod.ts';

export const cleanCmd: CommandDesc = {
    help: help,
    run: run,
};

function help() {
    log.help([
        'clean',
        'clean [--all]',
        'clean [config...]',
    ], 'clean build output for current, all or a specific configs');
}

async function run(project: Project) {
    let all = false;
    let configs: Config[] = [];
    for (let i = 1; i < Deno.args.length; i++) {
        const arg = Deno.args[i];
        if (arg.startsWith('--')) {
            if (arg === '--all') {
                all = true;
            } else {
                log.error(`unknown arg '${arg}' (run 'fibs help clean')`);
            }
        } else {
            const config = project.configs[arg];
            if (config === undefined) {
                log.error(`unknown config '${arg}' (run 'fibs list configs')`);
            }
            configs.push(config);
        }
    }
    if (all) {
        for (const k in project.configs) {
            configs.push(project.configs[k]);
        }
    } else if (configs.length === 0) {
        configs = [util.activeConfig(project)];
    }
    let numDeleted = 0;
    for (const config of configs) {
        const buildPath = util.buildDir(project, config);
        const distPath = util.distDir(project, config);
        const buildExists = util.dirExists(buildPath);
        const distExists = util.dirExists(distPath);
        if (buildExists || distExists) {
            log.section(config.name);
            if (buildExists) {
                log.info(`  delete ${buildPath}`);
                Deno.removeSync(buildPath, { recursive: true });
                numDeleted += 1;
            }
            if (distExists) {
                log.info(`  delete ${distPath}`);
                Deno.removeSync(distPath, { recursive: true });
                numDeleted += 1;
            }
            log.print('');
        }
    }
    if (0 === numDeleted) {
        log.print('nothing to do');
    } else {
        log.print(`${numDeleted} directories deleted`);
    }
}
