import { Project, Command } from '../../mod.ts';

export const help: Command = {
  name: 'help',

  help: (project: Project) => {
    console.log(`help.help() called for project '${project.name}'`);
  },

  run: async (project: Project) => {
    console.log(`help.run() called for project '${project.name}'`);
  },
};
