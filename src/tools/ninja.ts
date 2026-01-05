import { util } from '../lib/index.ts';
import type { ToolDesc } from '../types.ts';

export const ninjaTool: ToolDesc = {
    name: 'ninja',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for building *-ninja-* configs',
    exists,
};

export async function exists(): Promise<boolean> {
    try {
        await util.runCmd('ninja', { args: ['--version'], stdout: 'null', showCmd: false });
        return true;
    } catch (_err) {
        return false;
    }
}
