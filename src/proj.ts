import { path } from '../deps.ts';
import { Adapter, Command, Config, ConfigDesc, Project, ProjectDesc, Target, Tool } from './types.ts';
import * as settings from './settings.ts';
import * as log from './log.ts';

export async function setup(
    rootImportMeta: any,
    rootDesc: ProjectDesc,
    stdDesc: ProjectDesc,
): Promise<Project> {
    // start populating project with std properties
    const project: Project = {
        name: rootDesc.name,
        dir: path.parse(path.fromFileUrl(rootImportMeta.url)).dir,
        settings: {},
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
            };
            into.tools[name] = tool;
        }
    }
    if (other.configs) {
        for (const name in other.configs) {
            if (other.configs[name].ignore) {
                continue;
            }
            const desc = resolveConfigDesc(other.configs, name);
            if (desc.platform === undefined) {
                log.error(`config '${name}' requires 'platform' field`);
            }
            if (desc.buildType === undefined) {
                log.error(`config '${name}' requires 'buildType' field`);
            }
            const config: Config = {
                name: name,
                platform: desc.platform,
                buildType: desc.buildType,
                generator: desc.generator ?? null,
                arch: desc.arch ?? null,
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
    if (other.settings) {
        for (const key in other.settings) {
            into.settings[key] = other.settings[key];
        }
    }
}

function resolveConfigDesc(configs: Record<string, ConfigDesc>, name: string): ConfigDesc {
    let inheritChain: ConfigDesc[] = [];
    const maxInherits = 8;
    let curName = name;
    while (inheritChain.length < maxInherits) {
        const config = configs[curName];
        inheritChain.unshift(config);
        if (config.inherits !== undefined) {
            if (configs[config.inherits] === undefined) {
                log.error(`config '${curName}' tries to inherit from non-existing config '${config.inherits}'`);
            }
            curName = config.inherits;
        } else {
            break;
        }
    }
    if (inheritChain.length === maxInherits) {
        log.error(`circular dependency in config '${name}'?`);
    }
    let res: ConfigDesc = {};
    inheritChain.forEach((config) => {
        Object.assign(res, structuredClone(config));
    });
    return res;
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
