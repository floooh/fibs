import { ToolDesc, git } from '../../mod.ts';

export const gitTool: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for fetching imports',
    exists: exists,
};

export async function exists(): Promise<boolean> {
    return await git.exists();
}
