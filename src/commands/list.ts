import { CommandDesc, imports, log, proj, Project, TargetType, util } from '../../mod.ts';
import { colors } from '../../deps.ts';

export const listCmd: CommandDesc = { name: 'list', help, run };

function help() {
    log.helpCmd([
        'list',
        'list settings',
        'list configs',
        'list imports',
        'list runners',
        'list openers',
        'list jobs',
        'list targets [--all] [--exe] [--lib] [--dll] [--interface] [--disabled]',
    ], 'list available configs, current settings, targets, ...');
}

const allTargetTypes: TargetType[] = ['windowed-exe', 'plain-exe', 'lib', 'dll', 'interface'];

async function run(project: Project) {
    const args = parseArgs();
    if (args.all) {
        log.section('settings');
    }
    if (args.all || args.settings) {
        for (const [key, val] of Object.entries(project.settings)) {
            const def = val.default;
            log.print(`${key}: ${val.value} (default: ${def})`);
        }
    }
    if (args.all) {
        log.print();
        log.section('configs');
    }
    if (args.all || args.configs) {
        for (const config of project.configs) {
            log.print(config.name);
        }
    }
    if (args.all) {
        log.print();
        log.section('imports');
    }
    if (args.all || args.imports) {
        for (const imp of project.imports.toReversed()) {
            if (imports.isLinked(project, imp.name)) {
                log.print(`${imp.name}: ${colors.brightBlue(`link => ${imp.importDir}`)}`);
            } else {
                log.print(`${imp.name}: ${imp.importDir}`);
            }
        }
    }
    if (args.all) {
        log.print();
        log.section('runners');
    }
    if (args.all || args.runners) {
        for (const runner of project.runners) {
            log.print(runner.name);
        }
    }
    if (args.all) {
        log.print();
        log.section('openers');
    }
    if (args.all || args.openers) {
        for (const opener of project.openers) {
            log.print(opener.name);
        }
    }
    if (args.all) {
        log.print();
        log.section('jobs');
    }
    if (args.all || args.jobs) {
        for (const job of project.jobs) {
            job.help();
        }
    }
    if (args.all) {
        log.print();
        log.section('targets');
    }
    if (args.all || (args.targetTypes.length > 0)) {
        const types = allTargetTypes;
        const targets = project.targets;
        const config = util.activeConfig(project);
        for (const type of types) {
            for (const target of targets) {
                if ((target.type === type) && (args.targetTypes.includes(type))) {
                    const str = `${target.name} (${target.type})`;
                    if (proj.isTargetEnabled(project, config, target)) {
                        log.print(str);
                    } else {
                        if (args.disabled) {
                            log.print(colors.gray(colors.strikethrough(str)));
                        }
                    }
                }
            }
        }
    }
    if (args.all) {
        log.print();
    }
}

function parseArgs(): {
    all: boolean;
    settings: boolean;
    configs: boolean;
    imports: boolean;
    runners: boolean;
    openers: boolean;
    jobs: boolean;
    disabled: boolean;
    targetTypes: TargetType[];
} {
    const args: ReturnType<typeof parseArgs> = {
        all: false,
        settings: false,
        configs: false,
        imports: false,
        runners: false,
        openers: false,
        jobs: false,
        disabled: false,
        targetTypes: [],
    };
    if (Deno.args.length === 1) {
        args.all = true;
        args.targetTypes = allTargetTypes;
    } else {
        const filter = Deno.args[1];
        switch (filter) {
            case 'settings':
                args.settings = true;
                break;
            case 'configs':
                args.configs = true;
                break;
            case 'imports':
                args.imports = true;
                break;
            case 'runners':
                args.runners = true;
                break;
            case 'openers':
                args.openers = true;
                break;
            case 'jobs':
                args.jobs = true;
                break;
            case 'targets':
                if (Deno.args.length === 2) {
                    args.targetTypes = allTargetTypes;
                } else if (Deno.args.length >= 3) {
                    for (let i = 2; i < Deno.args.length; i++) {
                        const targetArg = Deno.args[i];
                        const allTargetTypes: TargetType[] = ['plain-exe', 'windowed-exe', 'lib', 'dll', 'interface'];
                        switch (targetArg) {
                            case '--all':
                                args.targetTypes = allTargetTypes;
                                break;
                            case '--exe':
                                args.targetTypes.push('plain-exe', 'windowed-exe');
                                break;
                            case '--lib':
                                args.targetTypes.push('lib');
                                break;
                            case '--dll':
                                args.targetTypes.push('dll');
                                break;
                            case '--interface':
                                args.targetTypes.push('interface');
                                break;
                            case '--disabled':
                                args.disabled = true;
                                if (args.targetTypes.length === 0) {
                                    args.targetTypes = allTargetTypes;
                                }
                                break;
                            default:
                                log.error(`unknown target type arg '${targetArg}' (run 'fibs help list')`);
                        }
                    }
                }
                break;
            default:
                log.error(`unknown filter '${filter}' (run 'fibs help list')`);
        }
    }
    return args;
}
