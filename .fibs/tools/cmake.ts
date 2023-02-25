import { Project, Tool, Platform } from '../../mod.ts';

export const cmake: Tool = {
  name: 'cmake',
  platforms: [ Platform.windows, Platform.macos, Platform.linux ],
  optional: false,
  notFoundMsg: 'required for building projects',
  exists: exists,
}

export async function exists(_project: Project): Promise<boolean> {
  try {
    const p = Deno.run({ cmd: ['cmake', '--version'], stdout: 'piped' });
    await p.status();
    return true;
  } catch (_err) {
    return false;
  }
}
