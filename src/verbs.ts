import { Project } from './types.ts';

export async function importVerbs(project: Project) {
  try {
    const module = await import(`${Deno.cwd()}/${project.path}/.fibs/verbs.ts`);
    // FIXME: somehow make this type-safe
    if (module['verbs'] !== undefined) {
      project.verbs = module['verbs'];
    }
    console.log(project.verbs);
  } catch (err) {
    console.error(err);
  }
}
