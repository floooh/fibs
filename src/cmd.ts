import { Project } from './types.ts';
import * as log from './log.ts';

/**
 * Find and run a command.
 * @param project
 */
export async function run(project: Project, cmd: string) {
    try {
        if (project.commands![cmd] !== undefined) {
            await project.commands![cmd].run(project);
        } else {
            log.error(
                `command '${cmd}' not found in project '${project.name}', run 'fibs help'`,
            );
        }
    } catch (err) {
        log.error(err);
    }
}
