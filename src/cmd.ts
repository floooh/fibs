import { Project } from './types.ts';
import * as log from './log.ts';

/**
 * Recursively import all commands in a project and its dependencies.
 * This will populate the project.commands map.
 * @param project
 */
export async function importAll(project: Project) {
  try {
    const importPath = `file://${Deno.cwd()}/${project.path}/.fibs/commands.ts`;
    const module = await import(importPath);
    if (module['commands'] !== undefined) {
      project.commands = module['commands'];
    }
  } catch (err) {
    log.error(err);
  }
}

/**
 * Find and run a command.
 * @param project
 */
export async function run(project: Project, cmd: string) {
  try {
    if (project.commands![cmd] !== undefined) {
      await project.commands![cmd].run(project);
    } else {
      log.error(`command '${cmd}' not found in project '${project.name}', run 'fibs help'`);
    }
  } catch (err) {
    log.error(err);
  }
}
