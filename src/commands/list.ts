import { CommandDesc, log, Project, TargetType } from '../../mod.ts';

export const list: CommandDesc = {
    help: help,
    run: run,
};

function help(_project: Project) {
    log.help([
        'list',
        'list settings',
        'list configs',
        'list targets [all|exe(s)|lib(s)|dll(s)]',
    ], 'list available configs, current settings, targets, ...');
}

type ListArgs = {
    all: boolean;
    settings: boolean;
    configs: boolean;
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
        log.section('targets');
    }
    if (args.all || (args.targetTypes.length > 0)) {
        const types: TargetType[] = ['windowed-exe', 'plain-exe', 'lib', 'dll'];
        const targets = Object.values(project.targets);
        types.forEach((type) => {
            targets.forEach((tgt) => {
                if ((tgt.type === type) && (args.targetTypes.includes(type))) {
                    log.print(`${tgt.name} (${tgt.type})`);
                }
            });
        });
    }
    if (args.all) {
        log.print();
    }
}

function parseArgs(): ListArgs {
    let args: ListArgs = {
        all: false,
        settings: false,
        configs: false,
        targetTypes: [],
    };
    if (Deno.args.length === 1) {
        args.all = true;
    } else {
        const filter = Deno.args[1];
        switch (filter) {
            case 'settings':
                args.settings = true;
                break;
            case 'configs':
                args.configs = true;
                break;
            case 'targets':
                if (Deno.args.length === 2) {
                    args.targetTypes = ['plain-exe', 'windowed-exe', 'lib', 'dll'];
                } else if (Deno.args.length === 3) {
                    const targetType = Deno.args[2];
                    switch (targetType) {
                        case 'all':
                            args.targetTypes = ['plain-exe', 'windowed-exe', 'lib', 'dll'];
                            break;
                        case 'exe':
                        case 'exes':
                            args.targetTypes = ['plain-exe', 'windowed-exe'];
                            break;
                        case 'lib':
                        case 'libs':
                            args.targetTypes = ['lib'];
                            break;
                        case 'dll':
                        case 'dlls':
                            args.targetTypes = ['dll'];
                            break;
                        default:
                            log.error(`unknown target type '${targetType}' (run 'fibs help list')`);
                    }
                } else {
                    log.error('too many args (run \'fibs help list\')');
                }
                break;
            default:
                log.error(`unknown filter '${filter}' (run 'fibs help list')`);
        }
    }
    return args;
}
