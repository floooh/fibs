import { Verb, Project } from '../../fibs.ts';

export const diag: Verb = {
  name: 'diag',

  help: (project: Project) => {
    console.log(`diag.help() called for project '${project.name}'`);
  },

  run: (project: Project) => {
    console.log(`diag.run() called for project '${project.name}'`);
  },
}
