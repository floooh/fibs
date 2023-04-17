import { CommandDesc, log, Project, util } from '../../mod.ts';

export const resetCmd: CommandDesc = { name: 'reset', help, run };

function help() {
    log.helpCmd(['reset'], 'wipe the .fibs subdirectory and start from scratch');
}

async function run(project: Project) {
    const cwd = Deno.cwd().replaceAll('\\', '/');
    const fibsFile = `${cwd}/fibs.ts`;
    const fibsDir = `${cwd}/.fibs`;
    if (!util.fileExists(fibsFile)) {
        log.error('current directory is not a fibs project (no fibs.ts found)');
    }
    if (!util.dirExists(fibsDir)) {
        log.warn('no .fibs subdirectory in current directory');
        return;
    }
    if (log.ask(`ok to delete directory ${fibsDir}?`, false)) {
        Deno.removeSync(fibsDir, { recursive: true });
        log.info('ok');
    } else {
        log.info('not deleted');
    }
}
