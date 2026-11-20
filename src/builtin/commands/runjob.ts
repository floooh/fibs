import { log } from '../../lib/index.ts';
import { runJobFile } from '../../lib/jobs.ts';
import type { CommandDesc } from '../../types.ts';

export const runjobCmd: CommandDesc = { name: 'runjob', help, run: (_project, args) => run(args) };

function help() {
    log.helpCmd([
        'runjob [job-file]',
    ], [
        'runs a script job (invoked by the build process)',
    ]);
}

export async function run(args: string[]) {
    if (args.length < 2) {
        throw new Error(`expected a job file (run 'fibs help runjob')`);
    }
    await runJobFile(args[1]);
}
