import * as fibs from './fibs.ts';

const project: fibs.Project = {
  name: 'Bla',
  path: '.',
}

await fibs.importVerbs(project);

for (const k in project.verbs) {
  project.verbs[k].run(project);
}
