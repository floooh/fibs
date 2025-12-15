import { log, util } from '../lib/index.ts';
import { CommandDesc, Config, Project } from '../types.ts';
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
        const buildPath = project.buildDir(config.name);
        const distPath = project.distDir(config.name);
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
                log.panic(`unknown option '${arg}' (run 'fibs help clean')`);
            }
            return false;
        }
        return true;
    });
    if (all) {
        return project.configs;
    } else if (args.length === 0) {
        return [project.activeConfig()];
    } else {
        return args.map((arg) => project.config(arg));
    }
}
