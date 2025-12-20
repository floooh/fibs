import { ninjaTool } from './ninja.ts';
import { cmakeTool } from './cmake.ts';
import { gitTool } from './git.ts';
import { makeTool } from './make.ts';
import { vscodeTool } from './vscode.ts';

export const builtinTools = [
    gitTool,
    cmakeTool,
    ninjaTool,
    makeTool,
    vscodeTool,
];
