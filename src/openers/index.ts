import { Configurer } from '../types.ts';
import { vscodeOpener } from './vscode.ts';
import { vstudioOpener } from './vstudio.ts';
import { xcodeOpener } from './xcode.ts';

export function addDefaultOpeners(c: Configurer): void {
    c.addOpener(vscodeOpener);
    c.addOpener(vstudioOpener);
    c.addOpener(xcodeOpener);
}
