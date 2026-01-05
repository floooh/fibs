import { util } from '../lib/index.ts';
import type { ToolDesc } from '../types.ts';

export const httpServerTool: ToolDesc = {
    name: 'http-server',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for Emscripten debugging in VSCode (npm i -g http-server)',
    exists,
};

export async function exists(): Promise<boolean> {
    try {
        await util.runCmd('http-server', { args: ['-h'], stdout: 'null', showCmd: false });
        return true;
    } catch (_err) {
        return false;
    }
}
