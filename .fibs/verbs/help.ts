import { Verb, Project } from '../../fibs.ts';

export const help: Verb = {
  name: 'help',

  help: (project: Project) => {
    console.log(`help.help() called for project '${project.name}'`);
  },

  run: (project: Project) => {
    console.log(`help.run() called for project '${project.name}'`);
  },
}
