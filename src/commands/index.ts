import { Configurer } from '../types.ts';
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
import { updateCmd } from './update.ts';
import { runjobsCmd } from './runjobs.ts';

export function addDefaultCommands(c: Configurer): void {
    c.addCommand(helpCmd);
    c.addCommand(resetCmd);
    c.addCommand(configCmd);
    c.addCommand(buildCmd);
    c.addCommand(runCmd);
    c.addCommand(openCmd);
    c.addCommand(cleanCmd);
    c.addCommand(listCmd);
    c.addCommand(updateCmd);
    c.addCommand(diagCmd);
    c.addCommand(linkCmd);
    c.addCommand(unlinkCmd);
    c.addCommand(setCmd);
    c.addCommand(getCmd);
    c.addCommand(unsetCmd);
    c.addCommand(runjobsCmd);
}
