import {
    Adapter,
    AdapterOptions,
    Command,
    Config,
    ConfigDescWithImportDir,
    Project,
    ProjectDesc,
    Target,
    TargetCompileDefinitions,
    TargetCompileDefinitionsDesc,
    TargetIncludeDirectories,
    TargetIncludeDirectoriesDesc,
    TargetCompileOptions,
    TargetCompileOptionsDesc,
    TargetCompileOptionsFunc,
    TargetLinkOptions,
    TargetLinkOptionsDesc,
    TargetLinkOptionsFunc,
    TargetType,
    Tool,
} from './types.ts';
import * as settings from './settings.ts';
import * as log from './log.ts';
import * as imports from './imports.ts';

export async function setup(
    rootDir: string,
    rootDesc: ProjectDesc,
    stdDesc: ProjectDesc,
): Promise<Project> {
    // start populating project with std properties
    const project: Project = {
        name: rootDesc.name ?? 'project',
        dir: rootDir,
        imports: {},
        settings: {},
        targets: {},
        commands: {},
        tools: {},
        configs: {},
        configDescs: {},
        adapters: {},
    };

    // first integrate std project properties (tools, commands, ...)
    await integrate(project, stdDesc, rootDir);
    // followed by the root project properties
    await integrate(project, rootDesc, rootDir);

    // FIXME: resolve and integrate imports...

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
            name,
            importDir: desc.importDir,
            platform: desc.platform,
            buildType: desc.buildType,
            generator: desc.generator,
            arch: desc.arch ?? undefined,
            toolchainFile: desc.toolchainFile,
            variables: desc.variables ?? {},
            environment: desc.environment ?? {},
            defines: desc.defines ?? {},
        };
        project.configs[name] = config;
    }
}

async function integrate(into: Project, other: ProjectDesc, importDir: string) {
    // important to keep imports at the top!
    if (other.imports) {
        for (const name in other.imports) {
            const imp = other.imports[name];
            let projDesc = imp.projectDesc;
            const res = await imports.fetch(into, { name, url: imp.url, ref: imp.ref });
            if (res.valid) {
                if (projDesc === undefined) {
                    projDesc = res.projectDesc;
                }
            }
            if (projDesc) {
                await integrate(into, projDesc, res.path);
            }
            into.imports[name] = {
                name,
                importDir: res.path,
                url: imp.url,
                ref: imp.ref ?? null,
            };
        }
    }
    if (other.configs) {
        for (const name in other.configs) {
            into.configDescs[name] = { ...other.configs[name], importDir };
        }
    }
    if (other.targets) {
        // FIXME: any paths in target need to be resolved relative to the
        // integrated ProjectDesc's path (e.g. relative to the '@.' path alias)
        for (const name in other.targets) {
            const desc = other.targets[name];
            const target: Target = {
                name,
                importDir,
                dir: desc.dir,
                type: desc.type,
                sources: desc.sources ?? [],
                deps: {
                    libs: desc.libs ?? [],
                    frameworks: desc.frameworks ?? [],
                },
                includeDirectories: toIncludeDirectories(desc.includeDirectories, desc.type),
                compileDefinitions: toCompileDefinitions(desc.compileDefinitions, desc.type),
                compileOptions: toCompileOptions(desc.compileOptions, desc.type),
                linkOptions: toLinkOptions(desc.linkOptions, desc.type),
            };
            into.targets[name] = target;
        }
    }
    if (other.commands) {
        for (const name in other.commands) {
            const desc = other.commands[name];
            const command: Command = {
                name,
                importDir,
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
                name,
                importDir,
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
                name,
                importDir,
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

function toIncludeDirectories(desc: TargetIncludeDirectoriesDesc | undefined, type: TargetType): TargetIncludeDirectories {
    const res: TargetIncludeDirectories = {
        system: false,
        interface: [],
        private: [],
        public: [],
    };
    if (desc) {
        if (Array.isArray(desc)) {
            if (type === 'void') {
                res.interface = desc;
            } else {
                res.public = desc;
            }
        } else {
            res.system = desc.system ?? false;
            res.interface = desc.interface ?? [];
            res.private = desc.private ?? [];
            res.public = desc.public ?? [];
        }
    }
    return res;
}

function toCompileDefinitions(desc: TargetCompileDefinitionsDesc | undefined, type: TargetType): TargetCompileDefinitions {
    const res: TargetCompileDefinitions = {
        interface: {},
        private: {},
        public: {},
    };
    if (desc) {
        if ((typeof desc.interface === undefined)
            && (typeof desc.private === undefined)
            && (typeof desc.public === undefined))
        {
            // FIXME: that's ugly
            if (type === 'void') {
                res.interface = desc as any;
            } else {
                res.public = desc as any;
            }
        } else {
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
    }
    return res;
}

function toCompileOptions(desc: TargetCompileOptionsDesc | TargetCompileOptionsFunc | undefined, type: TargetType): TargetCompileOptions | TargetCompileOptionsFunc {
    const res: TargetCompileOptions = {
        interface: [],
        private: [],
        public: [],
    };
    if (desc) {
        if (typeof desc === 'function') {
            return desc;
        }
        else if (Array.isArray(desc)) {
            if (type === 'void') {
                res.interface = desc;
            } else {
                res.public = desc;
            }
        } else {
            res.interface = desc.interface ?? [];
            res.private = desc.private ?? [];
            res.public = desc.public ?? [];
        }
    }
    return res;
}

function toLinkOptions(desc: TargetLinkOptionsDesc | TargetLinkOptionsFunc | undefined, type: TargetType): TargetLinkOptions | TargetLinkOptionsFunc {
    const res: TargetLinkOptions = {
        interface: [],
        private: [],
        public: [],
    };
    if (desc) {
        if (typeof desc === 'function') {
            return desc;
        }
        else if (Array.isArray(desc)) {
            if (type === 'void') {
                res.interface = desc;
            } else {
                res.public = desc;
            }
        } else {
            res.interface = desc.interface ?? [];
            res.private = desc.private ?? [];
            res.public = desc.public ?? [];
        }
    }
    return res;
}

function resolveConfigDesc(configs: Record<string, ConfigDescWithImportDir>, name: string): ConfigDescWithImportDir {
    let inheritChain: ConfigDescWithImportDir[] = [];
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
    let res: ConfigDescWithImportDir = { importDir: configs[name].importDir };
    // FIXME: merge cmake variables, environment variables and defines
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
