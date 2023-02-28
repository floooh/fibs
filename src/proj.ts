import { path } from '../deps.ts';
import { Adapter, Config, Project, ProjectDesc, Target, Command, Tool } from './types.ts';
import * as settings from './settings.ts';

export async function setup(
    rootImportMeta: any,
    rootDesc: ProjectDesc,
    stdDesc: ProjectDesc,
): Promise<Project> {
    // start populating project with std properties
    const project: Project = {
        name: rootDesc.name,
        dir: path.parse(path.fromFileUrl(rootImportMeta.url)).dir,
        settings: {
            defaults: {},
            items: {},
        },
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

    settings.load(project);
    return project;
}

function integrate(into: Project, other: ProjectDesc) {
    if (other.settings) {
        for (const key in other.settings) {
            into.settings.defaults[key] = other.settings[key];
            into.settings.items[key] = into.settings.defaults[key];
        }
    }
    if (other.targets) {
        for (const name in other.targets) {
            const desc = other.targets[name];
            const target: Target = {
                name: name,
                type: desc.type,
                sources: desc.sources,
                deps: desc.deps ?? [],
                includeDirectories: desc.includeDirectories ?? [],
                compileDefinitions: desc.compileDefinitions ?? [],
                compileOptions: desc.compileOptions ?? [],
                linkOptions: desc.linkOptions ?? [],
            };
            into.targets.push(target);
        }
    }
    if (other.commands) {
        for (const name in other.commands) {
            const desc = other.commands[name];
            const command: Command = {
                name: name,
                help: desc.help,
                run: desc.run,
            };
            into.commands[name] = command;
        }
    }
    if (other.tools) {
        for (const name in other.tools) {
            const desc = other.tools[name];
            const tool: Tool = {
                name: name,
                platforms: desc.platforms,
                optional: desc.optional,
                notFoundMsg: desc.notFoundMsg,
                exists: desc.exists,
            }
            into.tools[name] = tool;
        }
    }
    if (other.configs) {
        for (const name in other.configs) {
            const desc = other.configs[name];
            const config: Config = {
                name: name,
                generator: desc.generator ?? null,
                arch: desc.arch,
                platform: desc.platform,
                toolchain: desc.toolchain ?? null,
                variables: desc.variables ?? {},
                environment: desc.environment ?? {},
            };
            into.configs[name] = config;
        }
    }
    if (other.adapters) {
        for (const name in other.adapters) {
            const desc = other.adapters[name];
            const adapter: Adapter = {
                name: name,
                generate: desc.generate,
                build: desc.build,
            };
            into.adapters[name] = adapter;
        }
    }
}

export async function generate(
    project: Project,
    config: Config,
    adapter: Adapter,
): Promise<void> {
    await adapter.generate(project, config);
}

export async function build(
    project: Project,
    config: Config,
    adapter: Adapter,
): Promise<void> {
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
