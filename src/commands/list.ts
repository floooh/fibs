import { CommandDesc, log, Project, TargetType } from '../../mod.ts';

export const listCmd: CommandDesc = { help, run };

function help() {
    log.help([
        'list',
        'list settings',
        'list configs',
        'list imports',
        'list runners',
        'list openers',
        'list targets [--all] [--exe] [--lib] [--dll]',
    ], 'list available configs, current settings, targets, ...');
}

const allTargetTypes: TargetType[] = ['windowed-exe', 'plain-exe', 'lib', 'dll'];

type ListArgs = {
    all: boolean;
    settings: boolean;
    configs: boolean;
    imports: boolean;
    runners: boolean;
    openers: boolean;
    targetTypes: TargetType[];
};

async function run(project: Project) {
    const args = parseArgs();
    if (args.all) {
        log.section('settings');
    }
    if (args.all || args.settings) {
        for (const key in project.settings) {
            const val = project.settings[key].value;
            const def = project.settings[key].default;
            log.print(`${key}: ${val} (default: ${def})`);
        }
    }
    if (args.all) {
        log.print();
        log.section('configs');
    }
    if (args.all || args.configs) {
        for (const key in project.configs) {
            log.print(`${project.configs[key].name}`);
        }
    }
    if (args.all) {
        log.print();
        log.section('imports');
    }
    if (args.all || args.imports) {
        for (const key in project.imports) {
            log.print(`${project.imports[key].name}: ${project.imports[key].importDir}`);
        }
    }
    if (args.all) {
        log.print();
        log.section('runners');
    }
    if (args.all || args.runners) {
        for (const key in project.runners) {
            log.print(`${project.runners[key].name}`);
        }
    }
    if (args.all) {
        log.print();
        log.section('openers');
    }
    if (args.all || args.openers) {
        for (const key in project.openers) {
            log.print(`${project.openers[key].name}`);
        }
    }
    if (args.all) {
        log.print();
        log.section('targets');
    }
    if (args.all || (args.targetTypes.length > 0)) {
        const types = allTargetTypes;
        const targets = Object.values(project.targets);
        types.forEach((type) => {
            targets.forEach((target) => {
                if ((target.type === type) && (args.targetTypes.includes(type))) {
                    log.print(`${target.name} (${target.type})`);
                }
            });
        });
    }
    if (args.all) {
        log.print();
    }
}

function parseArgs(): ListArgs {
    const args: ListArgs = {
        all: false,
        settings: false,
        configs: false,
        imports: false,
        runners: false,
        openers: false,
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
            case 'targets':
                if (Deno.args.length === 2) {
                    args.targetTypes = allTargetTypes;
                } else if (Deno.args.length >= 3) {
                    for (let i = 2; i < Deno.args.length; i++) {
                        const targetArg = Deno.args[i];
                        switch (targetArg) {
                            case '--all':
                                args.targetTypes = ['plain-exe', 'windowed-exe', 'lib', 'dll'];
                                break;
                            case '--exe':
                                args.targetTypes = ['plain-exe', 'windowed-exe'];
                                break;
                            case '--lib':
                                args.targetTypes = ['lib'];
                                break;
                            case '--dll':
                                args.targetTypes = ['dll'];
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
