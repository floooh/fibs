import { Project, Command } from '../../mod.ts';

export const diag: Command = {
  name: 'diag',

  help: (project: Project) => {
    console.log(`diag.help() called for project '${project.name}'`);
  },

  run: async (project: Project) => {
    console.log(`diag.run() called for project '${project.name}'`);
  },
};
