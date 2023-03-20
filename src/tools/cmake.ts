import { cmake, ToolDesc } from '../../mod.ts';

export const cmakeTool: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for building projects',
    exists,
};

export async function exists(): Promise<boolean> {
    return await cmake.exists();
}
