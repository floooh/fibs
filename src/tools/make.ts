import { ToolDesc, util } from '../../mod.ts';

export const makeTool: ToolDesc = {
    name: 'make',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for building *-make-* configs',
    exists,
};

export async function exists(): Promise<boolean> {
    try {
        await util.runCmd('make', { args: ['--version'], stdout: 'piped', showCmd: false, abortOnError: false });
        return true;
    } catch (_err) {
        return false;
    }
}
