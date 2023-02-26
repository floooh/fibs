import { Project, ProjectDesc } from './types.ts';

export async function setup(rootImportMeta: any, rootDesc: ProjectDesc, stdDesc: ProjectDesc): Promise<Project> {
  // start populating project with std properties
  const project: Project = {
    name: rootDesc.name,
    path: rootImportMeta.url,
    deps: {},
    targets: {},
    commands: {},
    tools: {},
    configs: {},
  }
  // first integrate std project properties (tools, commands, ...)
  integrate(project, stdDesc);
  // followed by the root project properties
  integrate(project, rootDesc);

  // FIXME: resolve and integrate dependencies...

  return project;
}

/*
  FIXME for importing

  try {
    const importPath = `file://${Deno.cwd()}/${project.path}/fibs.ts";
    const module = await import(importPath);
    if (module[''] !== undefined) {
      project.commands = module['commands'];
    }
  } catch (err) {
    log.error(err);
  }

*/

function integrate(into: Project, other: ProjectDesc) {
  if (other.targets) {
    other.targets.forEach((target) => {
      into.targets[target.name] = target;
    });
  }
  if (other.commands) {
    other.commands.forEach((command) => {
      into.commands[command.name] = command;
    })
  }
  if (other.tools) {
    other.tools.forEach((tool) => {
      into.tools[tool.name] = tool;
    });
  }
  if (other.configs) {
    other.configs.forEach((config) => {
      into.configs[config.name] = config;
    })
  }
}
