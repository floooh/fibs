import { ninjaTool } from './ninja.ts';
import { cmakeTool } from './cmake.ts';
import { gitTool } from './git.ts';
import { makeTool } from './make.ts';
import { vscodeTool } from './vscode.ts';
import { tarTool } from './tar.ts';

export const tools = [
    gitTool,
    cmakeTool,
    ninjaTool,
    makeTool,
    tarTool,
    vscodeTool,
];
