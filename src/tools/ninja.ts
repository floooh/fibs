import { ToolDesc, util } from '../../mod.ts';

export const ninjaTool: ToolDesc = {
    name: 'ninja',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for building *-ninja-* configs',
    exists,
};

export async function exists(): Promise<boolean> {
    try {
        await util.runCmd('ninja', { args: ['--version'], stdout: 'piped', showCmd: false, abortOnError: false });
        return true;
    } catch (_err) {
        return false;
    }
}
