import { helpCmd } from './help.ts';
import { configCmd } from './config.ts';
import { buildCmd } from './build.ts';
import { runCmd } from './run.ts';
import { openCmd } from './open.ts';
import { cleanCmd } from './clean.ts';
import { listCmd } from './list.ts';
import { diagCmd } from './diag.ts';
import { setCmd } from './set.ts';
import { getCmd } from './get.ts';
import { unsetCmd } from './unset.ts';
import { emsdkCmd } from './emsdk.ts';
import { wasisdkCmd } from './wasisdk.ts';
import { updateCmd } from './update.ts';

export const commands = {
    help: helpCmd,
    config: configCmd,
    build: buildCmd,
    run: runCmd,
    open: openCmd,
    clean: cleanCmd,
    list: listCmd,
    update: updateCmd,
    diag: diagCmd,
    set: setCmd,
    get: getCmd,
    unset: unsetCmd,
    emsdk: emsdkCmd,
    wasisdk: wasisdkCmd,
};
