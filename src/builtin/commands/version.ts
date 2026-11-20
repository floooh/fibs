import { log, util } from '../../lib/index.ts';
import type { CommandDesc } from '../../types.ts';

export const versionCmd: CommandDesc = { name: 'version', help, run };

function help() {
    log.helpCmd(['version'], 'print the fibs version');
}

export async function run() {
    const { version, localDir } = util.fibsInfo();
    log.print(`fibs ${version}${(localDir !== undefined) ? ` (local: ${localDir})` : ''}`);
}
