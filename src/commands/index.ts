import { helpCmd } from './help.ts';
import { resetCmd } from './reset.ts';
import { configCmd } from './config.ts';
import { buildCmd } from './build.ts';
import { runCmd } from './run.ts';
import { openCmd } from './open.ts';
import { cleanCmd } from './clean.ts';
import { listCmd } from './list.ts';
import { diagCmd } from './diag.ts';
import { linkCmd } from './link.ts';
import { unlinkCmd } from './unlink.ts';
import { setCmd } from './set.ts';
import { getCmd } from './get.ts';
import { unsetCmd } from './unset.ts';
import { emsdkCmd } from './emsdk.ts';
import { wasisdkCmd } from './wasisdk.ts';
import { updateCmd } from './update.ts';
import { runjobsCmd } from './runjobs.ts';

export const commands = [
    helpCmd,
    resetCmd,
    configCmd,
    buildCmd,
    runCmd,
    openCmd,
    cleanCmd,
    listCmd,
    updateCmd,
    diagCmd,
    linkCmd,
    unlinkCmd,
    setCmd,
    getCmd,
    unsetCmd,
    emsdkCmd,
    wasisdkCmd,
    runjobsCmd,
];
