import { Project, Tool, Platform } from '../../mod.ts';

export const ninja: Tool = {
  name: 'ninja',
  platforms: [ Platform.windows, Platform.macos, Platform.linux ],
  optional: false,
  notFoundMsg: 'required for building *-ninja-* configs',
  exists: exists,
}

export async function exists(_project: Project): Promise<boolean> {
  try {
    const p = Deno.run({ cmd: ['ninja', '--version'], stdout: 'piped' });
    await p.status();
    return true;
  } catch (_err) {
    return false;
  }
}
