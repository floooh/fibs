import { ninjaTool } from './ninja.ts';
import { cmakeTool } from './cmake.ts';
import { gitTool } from './git.ts';
import { makeTool } from './make.ts';
import { vscodeCmakeTools, vscodeCppTools, vscodeDwarfDebugging, vscodeTool } from './vscode.ts';

export const builtinTools = [
    gitTool,
    cmakeTool,
    ninjaTool,
    makeTool,
    vscodeTool,
    vscodeCppTools,
    vscodeCmakeTools,
    vscodeDwarfDebugging,
];
