import { Platform, Project, Tool } from '../../mod.ts';

export const cmake: Tool = {
    name: 'cmake',
    platforms: [Platform.Windows, Platform.Macos, Platform.Linux],
    optional: false,
    notFoundMsg: 'required for building projects',
    exists: exists,
};

export async function exists(_project: Project): Promise<boolean> {
    try {
        const p = Deno.run({ cmd: ['cmake', '--version'], stdout: 'piped' });
        await p.status();
        return true;
    } catch (_err) {
        return false;
    }
}
