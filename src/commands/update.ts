import { CommandDesc, log, Project } from '../../mod.ts';

export const updateCmd: CommandDesc = {
    help: help,
    run: run,
};

function help() {
    log.help([
        'update',
        'update [import]',
    ], 'update all or specific import');
}

async function run(project: Project) {
    const importNames = parseArgs(project);
    for (const importName of importNames) {
        const imp = project.imports[importName];
        log.section(`${imp.name}`);
        log.info('  FIXME!');
    }
}

function parseArgs(project: Project): string[] {
    let args = Deno.args.slice(1);
    let all = args.length === 0;
    if (all) {
        args = Object.values(project.imports).map((imp) => imp.name);
    }
    for (const arg of args) {
        if (project.imports[arg] === undefined) {
            log.error(`import '${arg}' not found (run 'fibs list imports')`);
        }
    }
    return args;
}
