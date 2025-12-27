import { log, util } from '../lib/index.ts';
import type { CommandDesc, Config, Project } from '../types.ts';
import { blue } from '@std/fmt/colors';

export const cleanCmd: CommandDesc = { name: 'clean', help, run };

function help() {
    log.helpCmd([
        'clean [config... | --all]',
    ], 'delete build output for current, specific or all configs');
}

async function run(project: Project, args: string[]) {
    const configs = parseArgs(project, args);
    let numDeleted = 0;
    for (const config of configs) {
        const buildPath = project.buildDir(config.name);
        const distPath = project.distDir(config.name);
        const configPath = project.configDir(config.name);
        const buildExists = util.dirExists(buildPath);
        const distExists = util.dirExists(distPath);
        const configExists = util.dirExists(configPath);
        if (buildExists || distExists || configExists) {
            log.info(blue(`${config.name}:`));
            if (configExists) {
                log.info(`  delete ${configPath}`);
                Deno.removeSync(configPath, { recursive: true });
                numDeleted += 1;
            }
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

function parseArgs(project: Project, cmdLineArgs: string[]): Config[] {
    let all = false;
    const args = cmdLineArgs.slice(1).filter((arg) => {
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
        return project.configs();
    } else if (args.length === 0) {
        return [project.activeConfig()];
    } else {
        return args.map((arg) => project.config(arg));
    }
}
