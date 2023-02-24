import * as fibs from './fibs.ts';

const project: fibs.Project = {
  name: 'Bla',
  path: '.',
}

await fibs.importCommands(project);

for (const k in project.commands) {
  project.commands[k].run(project);
}
