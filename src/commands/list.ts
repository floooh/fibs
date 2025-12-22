import { imports, log } from '../lib/index.ts';
import type { CommandDesc, Project, TargetType } from '../types.ts';
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
        'list targets [--all] [--exe] [--lib] [--dll] [--interface] [--verbose]',
    ], 'list available configs, current settings, targets, ...');
}

const allTargetTypes: TargetType[] = ['windowed-exe', 'plain-exe', 'lib', 'dll', 'interface'];

async function run(project: Project): Promise<void> {
    const args = parseArgs();
    if (args.all) {
        log.section('settings');
    }
    if (args.all || args.settings) {
        for (const s of project.settings()) {
            log.print(`${s.name}: ${s.value} (default: ${s.default})`);
        }
    }
    if (args.all) {
        log.print();
        log.section('configs');
    }
    if (args.all || args.configs) {
        for (const c of project.configs()) {
            log.print(c.name);
        }
    }
    if (args.all) {
        log.print();
        log.section('imports');
    }
    if (args.all || args.imports) {
        for (const i of project.imports().toReversed()) {
            if (imports.isLinked(project, i.name)) {
                log.print(`${i.name}: ${colors.brightBlue(`link => ${i.importDir}`)}`);
            } else {
                log.print(`${i.name}: ${i.importDir}`);
            }
        }
    }
    if (args.all) {
        log.print();
        log.section('runners');
    }
    if (args.all || args.runners) {
        for (const r of project.runners()) {
            log.print(r.name);
        }
    }
    if (args.all) {
        log.print();
        log.section('openers');
    }
    if (args.all || args.openers) {
        for (const o of project.openers()) {
            log.print(o.name);
        }
    }
    if (args.all) {
        log.print();
        log.section('jobs');
    }
    if (args.all || args.jobs) {
        for (const j of project.jobs()) {
            j.help();
        }
    }
    if (args.all) {
        log.print();
        log.section('targets');
    }
    if (args.all || (args.targetTypes.length > 0)) {
        const types = allTargetTypes;
        for (const type of types) {
            for (const target of project.targets()) {
                if ((target.type === type) && (args.targetTypes.includes(type))) {
                    if (args.verbose) {
                        log.print(`${colors.blue(target.name)}: ${target.type} => ${target.importDir}`);
                    } else {
                        log.print(target.name);
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
    verbose: boolean;
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
        verbose: false,
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
                            case '--verbose':
                                args.verbose = true;
                                break;
                            default:
                                log.panic(`unknown target type arg '${targetArg}' (run 'fibs help list')`);
                        }
                    }
                    if (args.targetTypes.length === 0) {
                        args.targetTypes = allTargetTypes;
                    }
                }
                break;
            default:
                log.panic(`unknown filter '${filter}' (run 'fibs help list')`);
        }
    }
    return args;
}
