import { Project, Tool, Platform } from '../../mod.ts';

export const git: Tool = {
  name: 'git',
  platforms: [ Platform.Windows, Platform.Macos, Platform.Linux ],
  optional: false,
  notFoundMsg: 'required for fetching imports',
  exists: exists,
}

export async function exists(_project: Project): Promise<boolean> {
  try {
    const p = Deno.run({ cmd: ['git', '--version'], stdout: 'piped' });
    await p.status();
    return true;
  } catch (_err) {
    return false;
  }
}
