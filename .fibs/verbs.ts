import { help } from './verbs/help.ts';
import { diag } from './verbs/diag.ts';

export const verbs = {
  [help.name]: help,
  [diag.name]: diag,
}
