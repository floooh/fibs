import { Project } from './types.ts';

export async function importCommands(project: Project) {
  try {
    const module = await import(`${Deno.cwd()}/${project.path}/.fibs/commands.ts`);
    // FIXME: somehow make this type-safe
    if (module['commands'] !== undefined) {
      project.commands = module['commands'];
    }
    console.log(project.commands);
  } catch (err) {
    console.error(err);
  }
}
