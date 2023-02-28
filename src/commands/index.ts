import { help } from './help.ts';
import { gen } from './gen.ts';
import { build } from './build.ts';
import { list } from './list.ts';
import { diag } from './diag.ts';
import { set } from './set.ts';
import { get } from './get.ts';
import { unset } from './unset.ts';

export const commands = [
    help,
    gen,
    build,
    list,
    diag,
    set,
    get,
    unset,
];
