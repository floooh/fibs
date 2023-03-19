import { vscodeOpener } from './vscode.ts';
import { vstudioOpener } from './vstudio.ts';
import { xcodeOpener } from './xcode.ts';

export const openers = {
    vscode: vscodeOpener,
    vstudio: vstudioOpener,
    xcode: xcodeOpener,
};
