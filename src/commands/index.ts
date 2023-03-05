import { help } from './help.ts';
import { config } from './config.ts';
import { build } from './build.ts';
import { run } from './run.ts';
import { clean } from './clean.ts';
import { list } from './list.ts';
import { diag } from './diag.ts';
import { set } from './set.ts';
import { get } from './get.ts';
import { unset } from './unset.ts';

export const commands = {
    help,
    config,
    build,
    run,
    clean,
    list,
    diag,
    set,
    get,
    unset,
};
