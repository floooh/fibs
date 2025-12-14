import { cmake, ToolDesc } from '../../index.ts';

export const cmakeTool: ToolDesc = {
    name: 'cmake',
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for building projects',
    exists,
};

export async function exists(): Promise<boolean> {
    return await cmake.exists();
}
