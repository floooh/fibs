import { path } from '../deps.ts';
import {
    Adapter,
    AdapterOptions,
    Command,
    Config,
    ConfigDesc,
    Project,
    ProjectDesc,
    Target,
    TargetCompileDefinitions,
    TargetCompileDefinitionsDesc,
    TargetCompileOptions,
    TargetCompileOptionsDesc,
    TargetIncludeDirectories,
    TargetIncludeDirectoriesDesc,
    TargetLinkOptions,
    TargetLinkOptionsDesc,
    Tool,
} from './types.ts';
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
        targets: {},
        commands: {},
        tools: {},
        configs: {},
        configDescs: {},
        adapters: {},
    };

    // first integrate std project properties (tools, commands, ...)
    integrate(project, stdDesc);
    // followed by the root project properties
    integrate(project, rootDesc);

    // FIXME: resolve and integrate dependencies...

    // build resulting config list (happens as a post-step because configs can be inherited)
    resolveConfigs(project);

    settings.load(project);

    // FIXME: validate the resulting project (esp target dependencies)

    return project;
}

function resolveConfigs(project: Project) {
    project.configs = {};
    for (const name in project.configDescs) {
        if (project.configDescs[name].ignore) {
            continue;
        }
        const desc = resolveConfigDesc(project.configDescs, name);
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
            generator: desc.generator ?? undefined,
            arch: desc.arch ?? undefined,
            toolchainFile: desc.toolchainFile ?? undefined,
            variables: desc.variables ?? {},
            environment: desc.environment ?? {},
        };
        project.configs[name] = config;
    }
}

function integrate(into: Project, other: ProjectDesc) {
    if (other.configs) {
        for (const name in other.configs) {
            into.configDescs[name] = other.configs[name];
        }
    }
    if (other.targets) {
        for (const name in other.targets) {
            const desc = other.targets[name];
            const target: Target = {
                name: name,
                dir: desc.dir,
                type: desc.type,
                sources: desc.sources,
                deps: {
                    libs: desc.libs ?? [],
                    frameworks: desc.frameworks ?? [],
                },
                includeDirectories: toIncludeDirectories(desc.includeDirectories),
                compileDefinitions: toCompileDefinitions(desc.compileDefinitions),
                compileOptions: toCompileOptions(desc.compileOptions),
                linkOptions: toLinkOptions(desc.linkOptions),
            };
            into.targets[name] = target;
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
    if (other.adapters) {
        for (const name in other.adapters) {
            const desc = other.adapters[name];
            const adapter: Adapter = {
                name: name,
                configure: desc.configure,
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

function toIncludeDirectories(desc: TargetIncludeDirectoriesDesc | undefined): TargetIncludeDirectories {
    const res: TargetIncludeDirectories = {
        system: false,
        interface: [],
        private: [],
        public: [],
    };
    if (desc) {
        if (Array.isArray(desc)) {
            res.public = desc;
        } else {
            res.system = desc.system ?? false;
            res.interface = desc.interface ?? [];
            res.private = desc.private ?? [];
            res.public = desc.public ?? [];
        }
    }
    return res;
}

function toCompileDefinitions(desc: TargetCompileDefinitionsDesc | undefined): TargetCompileDefinitions {
    const res: TargetCompileDefinitions = {
        interface: {},
        private: {},
        public: {},
    };
    if (desc) {
        if (typeof desc.interface === 'object') {
            res.interface = desc.interface;
        }
        if (typeof desc.private === 'object') {
            res.private = desc.private;
        }
        if (typeof desc.public === 'object') {
            res.public = desc.public;
        }
    }
    return res;
}

function toCompileOptions(desc: TargetCompileOptionsDesc | undefined): TargetCompileOptions {
    const res: TargetCompileOptions = {
        interface: [],
        private: [],
        public: [],
    };
    if (desc) {
        if (Array.isArray(desc)) {
            res.public = desc;
        } else {
            res.interface = desc.interface ?? [];
            res.private = desc.private ?? [];
            res.public = desc.public ?? [];
        }
    }
    return res;
}

function toLinkOptions(desc: TargetLinkOptionsDesc | undefined): TargetLinkOptions {
    const res: TargetLinkOptions = {
        interface: [],
        private: [],
        public: [],
    };
    if (desc) {
        if (Array.isArray(desc)) {
            res.public = desc;
        } else {
            res.interface = desc.interface ?? [];
            res.private = desc.private ?? [];
            res.public = desc.public ?? [];
        }
    }
    return res;
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

export async function configure(
    project: Project,
    config: Config,
    adapter: Adapter,
    options: AdapterOptions,
): Promise<void> {
    await adapter.configure(project, config, options);
}

export async function build(
    project: Project,
    config: Config,
    adapter: Adapter,
    options: AdapterOptions,
): Promise<void> {
    await adapter.build(project, config, options);
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
