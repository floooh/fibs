import { Project } from './types.ts';
import * as log from './log.ts';

/**
 * Recursively import all tool wrappers in a project and its dependencies.
 * This will populate the project.tools map.
 * @param project
 */
export async function importAll(project: Project) {
  try {
    const importPath = `file://${Deno.cwd()}/${project.path}/.fibs/tools.ts`;
    const module = await import(importPath);
    if (module['tools'] !== undefined) {
      project.tools = module['tools'];
    }
  } catch (err) {
    log.error(err);
  }
}
