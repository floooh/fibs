import { path } from '../deps.ts';
import { Project, ProjectDesc, Adapter, Config } from './types.ts';

export async function setup(
    rootImportMeta: any,
    rootDesc: ProjectDesc,
    stdDesc: ProjectDesc,
): Promise<Project> {
    // start populating project with std properties
    const project: Project = {
        name: rootDesc.name,
        dir: path.parse(path.fromFileUrl(rootImportMeta.url)).dir,
        deps: {},
        targets: [],
        commands: {},
        tools: {},
        configs: {},
        adapters: {},
    };
    // first integrate std project properties (tools, commands, ...)
    integrate(project, stdDesc);
    // followed by the root project properties
    integrate(project, rootDesc);

    // FIXME: resolve and integrate dependencies...

    return project;
}

function integrate(into: Project, other: ProjectDesc) {
    if (other.targets) {
        other.targets.forEach((target) => {
            into.targets.push(target);
        });
    }
    if (other.commands) {
        other.commands.forEach((command) => {
            into.commands[command.name] = command;
        });
    }
    if (other.tools) {
        other.tools.forEach((tool) => {
            into.tools[tool.name] = tool;
        });
    }
    if (other.configs) {
        other.configs.forEach((config) => {
            into.configs[config.name] = config;
        });
    }
    if (other.adapters) {
        other.adapters.forEach((adapter) => {
            into.adapters[adapter.name] = adapter;
        });
    }
}

export async function generate(project: Project, config: Config, adapter: Adapter): Promise<void> {
    await adapter.generate(project, config);
}

export async function build(project: Project, config: Config, adapter: Adapter): Promise<void> {
    await adapter.build(project, config);
}

/*
  FIXME for importing

  try {
    const importPath = `${path.toFileUrl(Deno.cwd()).href}/${project.path}/fibs.ts";
    const module = await import(importPath);
    if (module[''] !== undefined) {
      project.commands = module['commands'];
    }
  } catch (err) {
    log.error(err);
  }

*/
