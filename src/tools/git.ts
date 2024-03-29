import { git, ToolDesc } from '../../mod.ts';

export const gitTool: ToolDesc = {
    name: 'git',
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for fetching imports',
    exists,
};

export async function exists(): Promise<boolean> {
    return await git.exists();
}
