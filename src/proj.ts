import {
    Adapter,
    AdapterOptions,
    Command,
    Config,
    ConfigDescWithImportDir,
    Project,
    ProjectDesc,
    Tool,
} from './types.ts';
import * as settings from './settings.ts';
import * as log from './log.ts';
import * as imports from './imports.ts';
import * as util from './util.ts';

export async function setup(
    rootDir: string,
    rootDesc: ProjectDesc,
    stdDesc: ProjectDesc,
): Promise<Project> {
    // start populating project with std properties
    const project: Project = {
        name: rootDesc.name ?? 'project',
        dir: rootDir,
        settings: {},
        variables: {},
        includeDirectories: [],
        compileDefinitions: [],
        compileOptions: [],
        linkOptions: [],
        imports: {},
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
    if (other.variables) {
        for (const name in other.variables) {
            into.variables[name] = other.variables[name];
        }
    }
    if (other.includeDirectories) {
        if (typeof other.includeDirectories === 'function') {
            into.includeDirectories.push(other.includeDirectories);
        } else {
            into.includeDirectories.push(...other.includeDirectories);
        }
    }
    if (other.compileDefinitions) {
        if (typeof other.compileDefinitions === 'function') {
            into.compileDefinitions.push(other.compileDefinitions);
        } else {
            into.compileDefinitions.push(...other.compileDefinitions);
        }
    }
    if (other.compileOptions) {
        if (typeof other.compileOptions === 'function') {
            into.compileOptions.push(other.compileOptions);
        } else {
            into.compileOptions.push(...other.compileOptions);
        }
    }
    if (other.linkOptions) {
        if (typeof other.linkOptions === 'function') {
            into.linkOptions.push(other.linkOptions);
        } else {
            into.linkOptions.push(...other.linkOptions);
        }
    }
    if (other.configs) {
        for (const name in other.configs) {
            into.configDescs[name] = { ...other.configs[name], importDir };
        }
    }
    if (other.targets) {
        for (const name in other.targets) {
            const desc = other.targets[name];
            into.targets[name] = {
                name,
                importDir,
                dir: desc.dir,
                type: desc.type,
                sources: desc.sources ?? [],
                libs: desc.libs ?? [],
                includeDirectories: util.asTargetItems(desc.includeDirectories),
                compileDefinitions: util.asTargetItems(desc.compileDefinitions),
                compileOptions: util.asTargetItems(desc.compileOptions),
                linkOptions: util.asTargetItems(desc.linkOptions),
            };
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
