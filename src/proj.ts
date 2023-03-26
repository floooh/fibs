import {
    Adapter,
    AdapterOptions,
    Config,
    ConfigDescWithImportDir,
    Job,
    Language,
    Project,
    ProjectDesc,
    Target,
    TargetBuildContext,
    TargetItems,
    TargetItemsDesc,
    TargetJob,
    TargetJobDesc,
} from './types.ts';
import * as settings from './settings.ts';
import * as log from './log.ts';
import * as imports from './imports.ts';
import * as util from './util.ts';
import { conf } from '../mod.ts';

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
        jobs: {},
        runners: {},
        openers: {},
        configs: {},
        configDescs: {},
        adapters: {},
    };

    // first integrate std project properties (tools, commands, ...)
    await integrate(project, stdDesc, rootDir);
    // followed by the root project properties
    await integrate(project, rootDesc, rootDir);
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
        let runner = (desc.runner !== undefined) ? project.runners[desc.runner] : project.runners['native'];
        if (runner === undefined) {
            log.error(`config '${name}' has unknown runner '${desc.runner}'`);
        }
        let opener = undefined;
        if (desc.opener !== undefined) {
            opener = project.openers[desc.opener];
            if (opener === undefined) {
                log.error(`config '${name}' has unknown opener '${desc.opener}'`);
            }
        }
        const config: Config = {
            name,
            importDir: desc.importDir,
            platform: desc.platform,
            runner: runner,
            opener: opener,
            buildType: desc.buildType,
            generator: desc.generator,
            arch: desc.arch ?? undefined,
            toolchainFile: desc.toolchainFile,
            variables: desc.variables ?? {},
            environment: desc.environment ?? {},
            includeDirectories: [],
            compileDefinitions: [],
            compileOptions: [],
            linkOptions: [],
        };
        if (desc.includeDirectories) {
            if (typeof desc.includeDirectories === 'function') {
                config.includeDirectories = [desc.includeDirectories];
            } else {
                config.includeDirectories = desc.includeDirectories;
            }
        }
        if (desc.compileDefinitions) {
            if (typeof desc.compileDefinitions === 'function') {
                config.compileDefinitions = [desc.compileDefinitions];
            } else {
                config.compileDefinitions = desc.compileDefinitions;
            }
        }
        if (desc.compileOptions) {
            if (typeof desc.compileOptions === 'function') {
                config.compileOptions = [desc.compileOptions];
            } else {
                config.compileOptions = desc.compileOptions;
            }
        }
        if (desc.linkOptions) {
            if (typeof desc.linkOptions === 'function') {
                config.linkOptions = [desc.linkOptions];
            } else {
                config.linkOptions = desc.linkOptions;
            }
        }
        project.configs[name] = config;
    }
}

export function asTargetItems(inp: TargetItemsDesc | undefined): TargetItems {
    return {
        interface: (inp && inp.interface) ?? [],
        private: (inp && inp.private) ?? [],
        public: (inp && inp.public) ?? [],
    };
}

export function asTargetJobs(project: Project, targetName: string, descs?: TargetJobDesc[]): TargetJob[] {
    if (descs === undefined) {
        return [];
    }
    return descs.map((desc) => ({job: desc.job, args: desc.args}));
}

async function integrate(into: Project, other: ProjectDesc, importDir: string) {
    // important to keep imports at the top!
    if (other.imports) {
        for (const name in other.imports) {
            const importDesc = other.imports[name];
            const fetchResult = await imports.fetch(into, { name, url: importDesc.url, ref: importDesc.ref });
            if (fetchResult.valid) {
                const projectDescs = await imports.importProjects(fetchResult.dir, importDesc);
                for (const projDesc of projectDescs) {
                    await integrate(into, projDesc, fetchResult.dir);
                }
            }
            into.imports[name] = {
                name,
                importDir: fetchResult.dir,
                url: importDesc.url,
                ref: importDesc.ref,
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
    if (other.commands) {
        for (const name in other.commands) {
            const desc = other.commands[name];
            into.commands[name] = {
                name,
                importDir,
                help: desc.help,
                run: desc.run,
            };
        }
    }
    if (other.tools) {
        for (const name in other.tools) {
            const desc = other.tools[name];
            into.tools[name] = {
                name,
                importDir,
                platforms: desc.platforms,
                optional: desc.optional,
                notFoundMsg: desc.notFoundMsg,
                exists: desc.exists,
            };
        }
    }
    if (other.jobs) {
        for (const name in other.jobs) {
            const desc = other.jobs[name];
            into.jobs[name] = {
                name,
                importDir,
                help: desc.help,
                validate: desc.validate,
                builder: desc.builder,
            }
        }
    }
    if (other.runners) {
        for (const name in other.runners) {
            const desc = other.runners[name];
            into.runners[name] = {
                name,
                importDir,
                run: desc.run,
            };
        }
    }
    if (other.openers) {
        for (const name in other.openers) {
            const desc = other.openers[name];
            into.openers[name] = {
                name,
                importDir,
                configure: desc.configure,
                open: desc.open,
            };
        }
    }
    if (other.adapters) {
        for (const name in other.adapters) {
            const desc = other.adapters[name];
            into.adapters[name] = {
                name,
                importDir,
                configure: desc.configure,
                build: desc.build,
            };
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
                includeDirectories: asTargetItems(desc.includeDirectories),
                compileDefinitions: asTargetItems(desc.compileDefinitions),
                compileOptions: asTargetItems(desc.compileOptions),
                linkOptions: asTargetItems(desc.linkOptions),
                jobs: asTargetJobs(into, name, desc.jobs),
            };
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

export type ValidateTargetOptions = {
    silent?: boolean;
    abortOnError?: boolean;
};

type ValidateTargetResult = {
    valid: boolean;
    hints: string[];
};

export function validateTarget(
    project: Project,
    target: Target,
    options: ValidateTargetOptions,
): ValidateTargetResult {
    const {
        silent = false,
        abortOnError = false,
    } = options;

    const res: ValidateTargetResult = {
        valid: true,
        hints: [],
    };

    // check restrictions for interface targets
    if (target.type === 'interface') {
        const checkInterfaceItems = (items: TargetItems): boolean => {
            if ((typeof items.private === 'function') || (items.private.length > 0)) {
                return false;
            }
            if ((typeof items.public === 'function') || (items.public.length > 0)) {
                return false;
            }
            return true;
        };
        if ((target.sources.length > 0)) {
            res.valid = false;
            res.hints.push(`target type 'interface' cannot have source files attached`);
        }
        if (!checkInterfaceItems(target.includeDirectories)) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface include directories`);
        }
        if (!checkInterfaceItems(target.compileDefinitions)) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface compile definitins`);
        }
        if (!checkInterfaceItems(target.compileOptions)) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface compile options`);
        }
        if (!checkInterfaceItems(target.linkOptions)) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface link options`);
        }
    }

    // check that jobs exist and have valid arg types
    const config = util.activeConfig(project);
    for (const targetJob of target.jobs) {
        const targetJobRes = validateTargetJob(project, config, target, targetJob);
        if (!targetJobRes.valid) {
            res.valid = false;
            res.hints.push(...targetJobRes.hints);
        }
    }

    // check that source files exist
    const aliasMap = util.buildAliasMap({ project, config, target, selfDir: target.importDir });
    const srcDir = util.resolvePath(aliasMap, target.importDir, target.dir);
    if (!util.dirExists(srcDir)) {
        res.valid = false;
        res.hints.push(`src dir not found: ${srcDir}`);
    } else {
        for (const src of target.sources) {
            const srcFile = util.resolvePath(aliasMap, srcDir, src);
            if (!util.fileExists(srcFile)) {
                res.valid = false;
                res.hints.push(`src file not found: ${srcFile}`);
            }
        }
    }

    // check that include directories exist
    let missingIncludeDirectories: string[] = [];
    const checkMissingDirs = (dirs: string[]): string[] => {
        return dirs.filter((dir) => {
            return !util.dirExists(dir);
        });
    };
    ['c', 'cxx'].forEach((language) => {
        conf.compilers(config).forEach((compiler) => {
            const ctx: TargetBuildContext = {
                project,
                config,
                compiler,
                target,
                language: language as Language,
            };
            const resolvedItems = util.resolveTargetItems(target.includeDirectories, ctx, true);
            missingIncludeDirectories.push(...checkMissingDirs(resolvedItems.interface));
            missingIncludeDirectories.push(...checkMissingDirs(resolvedItems.private));
            missingIncludeDirectories.push(...checkMissingDirs(resolvedItems.public));
        });
    });
    if (missingIncludeDirectories.length > 0) {
        // remove duplicates
        missingIncludeDirectories = [...new Set(missingIncludeDirectories)];
        res.valid = false;
        res.hints.push(...missingIncludeDirectories.map((dir) => `include directory not found: ${dir}`));
    }

    if (!res.valid && !silent) {
        const msg = [`target '${target.name} not valid:\n`, ...res.hints].join('\n  ') + '\n';
        if (abortOnError) {
            log.error(msg);
        } else {
            log.warn(msg);
        }
    }
    return res;
}

export type ValidateTargetJobResult = {
    valid: boolean;
    hints: string[];
};

export function validateTargetJob(project: Project, config: Config, target: Target, targetJob: TargetJob): ValidateTargetJobResult {
    const res: ValidateTargetJobResult = { valid: true, hints: [] };
    const jobName = targetJob.job;
    if (project.jobs[jobName] !== undefined) {
        const jobTemplate = project.jobs[jobName];
        const valRes = jobTemplate.validate(targetJob.args);
        if (!valRes.valid) {
            res.valid = false;
            res.hints.push(
                `job '${jobName}' in target '${target.name}' has invalid args:`,
                ...valRes.hints.map((hint) => `  - ${hint}`),
                'in:',
                ...JSON.stringify(targetJob.args, null, 2).split('\n').map((line) => `  ${line}`)
            );
        }
    } else {
        res.valid = false;
        res.hints.push(`unknown job '${jobName}' in target '${target.name}' (run 'fibs list jobs')`);
    }
    return res;
}

export function resolveJob(ctx: TargetBuildContext, targetJob: TargetJob): Job {
    const res = validateTargetJob(ctx.project, ctx.config, ctx.target, targetJob);
    if (!res.valid) {
        log.error(`failed to validate job ${targetJob.job} in target ${ctx.target.name}:\n${res.hints.map((line) => `  ${line}\n`)}`);
    }
    return ctx.project.jobs[targetJob.job].builder(targetJob.args)(ctx);
}

export async function runJobs(project: Project, config: Config, target: Target): Promise<boolean> {
    const ctx: TargetBuildContext = { project, config, target };
    for (const targetJob of target.jobs) {
        const job = resolveJob(ctx, targetJob);
        try {
            await job.func(job.inputs, job.outputs, job.args);
        } catch (err) {
            log.error(`job '${targetJob.job}' in target '${target.name}' failed with ${err}`);
        }
    }
    return true;
}
