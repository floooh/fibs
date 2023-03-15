import { CommandDesc, Config, log, Project, util } from '../../mod.ts';
import { colors } from '../../deps.ts';

export const cleanCmd: CommandDesc = {
    help: help,
    run: run,
};

function help() {
    log.help([
        'clean [config... | --all]',
    ], 'delete build output for current, specific or all configs');
}

async function run(project: Project) {
    const configs = parseArgs(project);
    let numDeleted = 0;
    configs.forEach((config) => {
        const buildPath = util.buildDir(project, config);
        const distPath = util.distDir(project, config);
        const buildExists = util.dirExists(buildPath);
        const distExists = util.dirExists(distPath);
        if (buildExists || distExists) {
            log.info(colors.blue(`${config.name}:`));
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
    });
    if (0 === numDeleted) {
        log.print('nothing to do');
    } else {
        log.print(`${numDeleted} directories deleted`);
    }
}

function parseArgs(project: Project): Config[] {
    let all = false;
    let args = Deno.args.slice(1).filter((arg) => {
        if (arg.startsWith('--')) {
            if (arg === '--all') {
                all = true;
            } else {
                log.error(`unknown option '${arg}' (run 'fibs help clean')`);
            }
            return false;
        }
        return true;
    });
    if (all) {
        return Object.values(project.configs);
    } else if (args.length === 0) {
        return [util.activeConfig(project)];
    } else {
        return args.map((arg) => {
            if (project.configs[arg] === undefined) {
                log.error(`unknown config '${arg}' (run 'fibs list configs')`);
            }
            return project.configs[arg];
        });
    }
}
