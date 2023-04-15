import { CommandDesc, Config, log, Project, util } from '../../mod.ts';
import { colors } from '../../deps.ts';

export const cleanCmd: CommandDesc = { name: 'clean', help, run };

function help() {
    log.helpCmd([
        'clean [config... | --all]',
    ], 'delete build output for current, specific or all configs');
}

async function run(project: Project) {
    const configs = parseArgs(project);
    let numDeleted = 0;
    for (const config of configs) {
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
    }
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
        return project.configs;
    } else if (args.length === 0) {
        return [util.activeConfig(project)];
    } else {
        return args.map((arg) => {
            const config = util.find(arg, project.configs);
            if (config === undefined) {
                log.error(`unknown config '${arg}' (run 'fibs list configs')`);
            }
            return config;
        });
    }
}
