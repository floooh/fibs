import { ToolDesc, util } from '../../mod.ts';

export const tarTool: ToolDesc = {
    name: 'tar',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for unpacking downloaded sdk archives',
    exists,
};

export async function exists(): Promise<boolean> {
    try {
        await util.runCmd('tar', { args: ['--version'], stdout: 'piped', showCmd: false, abortOnError: false });
        return true;
    } catch (_err) {
        return false;
    }
}
