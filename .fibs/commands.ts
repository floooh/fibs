import { help } from './commands/help.ts';
import { diag } from './commands/diag.ts';

export const commands = {
  [help.name]: help,
  [diag.name]: diag,
}
