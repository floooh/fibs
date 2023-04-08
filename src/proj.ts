import {
    Adapter,
    AdapterDesc,
    AdapterOptions,
    Config,
    ConfigDescWithImportDir,
    Job,
    Language,
    Project,
    ProjectDesc,
    ProjectListFunc,
    ProjectBuildContext,
    Target,
    TargetDesc,
    TargetBuildContext,
    TargetItems,
    TargetItemsDesc,
    TargetJob,
    TargetJobDesc,
    TargetListFunc,
    Opener,
    OpenerDesc,
    Runner,
    RunnerDesc,
    JobTemplate,
    JobTemplateDesc,
    Tool,
    ToolDesc,
    Command,
    CommandDesc,
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
    await integrateProjectDesc(project, stdDesc, rootDir);
    // followed by the root project properties
    await integrateProjectDesc(project, rootDesc, rootDir);
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
            cmakeVariables: desc.cmakeVariables ?? {},
            environment: desc.environment ?? {},
            options: desc.options ?? {},
            includeDirectories: desc.includeDirectories ?? [],
            compileDefinitions: desc.compileDefinitions ?? [],
            compileOptions: desc.compileOptions ?? [],
            linkOptions: desc.linkOptions ?? [],
        };
        project.configs[name] = config;
    }
}

function asMixedArray<S, T extends Function>(inp: S[] | T | undefined): (S | T)[] {
    if (inp === undefined) {
        return [];
    } else if (Array.isArray(inp)) {
        return inp;
    } else {
        return [ inp ];
    }
}

function asTargetItems(desc: TargetItemsDesc | undefined): TargetItems {
    return {
        interface: asMixedArray(desc?.interface),
        private: asMixedArray(desc?.private),
        public: asMixedArray(desc?.public),
    };
}

function asTargetJobs(targetName: string, descs?: TargetJobDesc[]): TargetJob[] {
    if (descs === undefined) {
        return [];
    }
    return descs.map((desc) => ({job: desc.job, args: desc.args}));
}

function assign<T>(into: T, src: T): T {
    return (src === undefined) ? into : src;
}

function mergeRecordsMaybeUndefined<T>(into: Record<string, T> | undefined, src: Record<string, T> | undefined): Record<string, T> | undefined {
    if ((into === undefined) && (src === undefined)) {
        return undefined;
    }
    if (into === undefined) {
        return structuredClone(src);
    }
    if (src === undefined) {
        return into;
    }
    return Object.assign(into, src);
}

function mergeArraysMaybeUndefined<T>(into: Array<T> | undefined, src: Array<T> | undefined): Array<T> | undefined {
    if ((into === undefined) && (src === undefined)) {
        return undefined;
    }
    if (into === undefined) {
        return structuredClone(src);
    }
    if (src === undefined) {
        return into;
    }
    return [...into, ...src];
}

function integrateCommand(intoRecord: Record<string, Command>, name: string, importDir: string, desc: CommandDesc) {
    const into = intoRecord[name];
    if (into === undefined) {
        intoRecord[name] = {
            name,
            importDir,
            help: desc.help,
            run: desc.run,
        }
    } else {
        into.help = desc.help;
        into.run = desc.run;
    }
}

function integrateTool(intoRecord: Record<string, Tool>, name: string, importDir: string, desc: ToolDesc) {
    const into = intoRecord[name];
    if (into === undefined) {
        intoRecord[name] = {
            name,
            importDir,
            platforms: desc.platforms,
            optional: desc.optional,
            notFoundMsg: desc.notFoundMsg,
            exists: desc.exists,
        };
    } else {
        into.platforms = desc.platforms;
        into.optional = desc.optional;
        into.notFoundMsg = desc.notFoundMsg;
        into.exists = desc.exists;
    }
}

function integrateJobTemplate(intoRecord: Record<string, JobTemplate>, name: string, importDir: string, desc: JobTemplateDesc) {
    const into = intoRecord[name];
    if (into === undefined) {
        intoRecord[name] = {
            name,
            importDir,
            help: desc.help,
            validate: desc.validate,
            builder: desc.builder,
        };
    } else {
        into.help = desc.help;
        into.validate = desc.validate;
        into.builder = desc.builder;
    }
}

function integrateRunner(intoRecord: Record<string, Runner>, name: string, importDir: string, desc: RunnerDesc) {
    const into = intoRecord[name];
    if (into === undefined) {
        intoRecord[name] = {
            name,
            importDir,
            run: desc.run,
        };
    } else {
        into.run = desc.run;
    }
}

function integrateOpener(intoRecord: Record<string, Opener>, name: string, importDir: string, desc: OpenerDesc) {
    const into = intoRecord[name];
    if (into === undefined) {
        intoRecord[name] = {
            name,
            importDir,
            configure: desc.configure,
            open: desc.open,
        };
    } else {
        into.configure = desc.configure;
        into.open = desc.open;
    }
}

function integrateAdapter(intoRecord: Record<string, Adapter>, name: string, importDir: string, desc: AdapterDesc) {
    const into = intoRecord[name];
    if (into === undefined) {
        intoRecord[name] = {
            name,
            importDir,
            configure: desc.configure,
            build: desc.build,
        };
    } else {
        into.configure = desc.configure;
        into.build = desc.build;
    }
}

function integrateTargetItems(into: TargetItems, from: TargetItems) {
    into.interface.push(...from.interface);
    into.private.push(...from.private);
    into.public.push(...from.public);
}

function integrateTarget(intoRecord: Record<string, Target>, name: string, importDir: string, desc: TargetDesc) {
    const into = intoRecord[name];
    const from = {
        name,
        importDir,
        dir: desc.dir,
        type: desc.type,
        enabled: desc.enabled ?? true,
        sources: asMixedArray(desc.sources),
        libs: asMixedArray(desc.libs),
        includeDirectories: asTargetItems(desc.includeDirectories),
        compileDefinitions: asTargetItems(desc.compileDefinitions),
        compileOptions: asTargetItems(desc.compileOptions),
        linkOptions: asTargetItems(desc.linkOptions),
        jobs: asTargetJobs(name, desc.jobs),
    }
    if (into === undefined) {
        intoRecord[name] = from;
    } else {
        if (into.type !== from.type) {
            throw new Error(`Cannot merge targets of different types (${from.type} vs ${into.type})`);
        }
        if (from.dir !== undefined) {
            into.dir = from.dir;
        }
        if (desc.enabled !== undefined) {
            into.enabled = from.enabled;
        }
        into.sources.push(...from.sources);
        into.libs.push(...from.libs);
        integrateTargetItems(into.includeDirectories, from.includeDirectories);
        integrateTargetItems(into.compileDefinitions, from.compileDefinitions);
        integrateTargetItems(into.compileOptions, from.compileOptions);
        integrateTargetItems(into.linkOptions, from.linkOptions);
        into.jobs.push(...from.jobs);
    }
}

function integrateObjectRecord<TYPE, DESC>(
    into: Record<string, TYPE>,
    from: Record<string, DESC> | undefined,
    importDir: string,
    objectIntegrateFunc: (into: Record<string, TYPE>, name: string, importDir: string, desc: DESC) => void)
{
    if (from !== undefined) {
        for (const [name, desc] of Object.entries(from)) {
            objectIntegrateFunc(into, name, importDir, desc);
        }
    }
}

function integrateRecord<TYPE>(into: Record<string, TYPE>, from: Record<string, TYPE> | undefined) {
    if (from !== undefined) {
        for (const [key, val] of Object.entries(from)) {
            into[key] = val;
        }
    }
}

function integrateProjectItems(into: (string | ProjectListFunc)[], from: ProjectListFunc | string[] | undefined) {
    if (from !== undefined) {
        if (typeof from === 'function') {
            into.push(from);
        } else {
            into.push(...from);
        }
    }
}

async function integrateProjectDesc(into: Project, other: ProjectDesc, importDir: string) {
    // important to keep imports at the top!
    if (other.imports !== undefined) {
        for (const [name,desc] of Object.entries(other.imports)) {
            const fetchResult = await imports.fetch(into, { name, url: desc.url, ref: desc.ref });
            let importErrors: Error[] = [];
            if (fetchResult.valid) {
                const importResult = await imports.importProjects(fetchResult.dir, desc);
                importErrors = importResult.importErrors;
                for (const projDesc of importResult.projectDescs) {
                    await integrateProjectDesc(into, projDesc, fetchResult.dir);
                }
            }
            into.imports[name] = {
                name,
                importErrors,
                importDir: fetchResult.dir,
                url: desc.url,
                ref: desc.ref,
            };
        }
    }
    if (other.configs !== undefined) {
        for (const [name,val] of Object.entries(other.configs)) {
            into.configDescs[name] = { ...val, importDir };
        }
    }
    integrateRecord(into.variables, other.variables);
    integrateProjectItems(into.includeDirectories, other.includeDirectories);
    integrateProjectItems(into.compileDefinitions, other.compileDefinitions);
    integrateProjectItems(into.compileOptions, other.compileOptions);
    integrateProjectItems(into.linkOptions, other.linkOptions);
    integrateObjectRecord(into.commands, other.commands, importDir, integrateCommand);
    integrateObjectRecord(into.tools, other.tools, importDir, integrateTool);
    integrateObjectRecord(into.jobs, other.jobs, importDir, integrateJobTemplate)
    integrateObjectRecord(into.runners, other.runners, importDir, integrateRunner);
    integrateObjectRecord(into.openers, other.openers, importDir, integrateOpener);
    integrateObjectRecord(into.adapters, other.adapters, importDir, integrateAdapter);
    integrateObjectRecord(into.targets, other.targets, importDir, integrateTarget);
    integrateRecord(into.settings, other.settings);
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
    let into: ConfigDescWithImportDir = { importDir: configs[name].importDir };
    inheritChain.forEach((src) => {
        into.ignore = assign(into.ignore, src.ignore);
        into.inherits = assign(into.inherits, src.inherits);
        into.platform = assign(into.platform, src.platform);
        into.runner = assign(into.runner, src.runner);
        into.opener = assign(into.opener, src.opener);
        into.buildType = assign(into.buildType, src.buildType);
        into.generator = assign(into.generator, src.generator);
        into.arch = assign(into.arch, src.arch);
        into.toolchainFile = assign(into.toolchainFile, src.toolchainFile);
        into.cmakeVariables = mergeRecordsMaybeUndefined(into.cmakeVariables, src.cmakeVariables);
        into.environment = mergeRecordsMaybeUndefined(into.environment, src.environment);
        into.options = mergeRecordsMaybeUndefined(into.options, src.options);
        into.includeDirectories = mergeArraysMaybeUndefined(into.includeDirectories, src.includeDirectories);
        into.compileDefinitions = mergeArraysMaybeUndefined(into.compileDefinitions, src.compileDefinitions);
        into.compileOptions = mergeArraysMaybeUndefined(into.compileDefinitions, src.compileOptions);
        into.linkOptions = mergeArraysMaybeUndefined(into.linkOptions, src.linkOptions);
    });
    return into;
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
        const ctx: TargetBuildContext = { project, config, target };
        const sources = resolveTargetStringList(target.sources, ctx, true);
        for (const src of sources) {
            if (!util.fileExists(src)) {
                res.valid = false;
                res.hints.push(`src file not found: ${src}`);
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
            const resolvedItems = resolveTargetItems(target.includeDirectories, ctx, true);
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

function resolveAliasOrPath(items: string[], baseDir: string, subDir: string | undefined, aliasMap: Record<string, string>, itemsAreFilePaths: boolean): string[] {
    if (itemsAreFilePaths) {
        return items.map((item) => util.resolvePath(aliasMap, baseDir, subDir, item));
    } else {
        return items.map((item) => util.resolveAlias(aliasMap, item));
    }
}

export function resolveProjectItems(itemsArray: (string | ProjectListFunc)[], ctx: ProjectBuildContext, itemsAreFilePaths: boolean): string[] {
    const aliasMap = util.buildAliasMap({
        project: ctx.project,
        config: ctx.config,
        selfDir: ctx.project.dir
    });
    const baseDir = ctx.project.dir;
    const subDir = undefined;
    return itemsArray.flatMap((item) => {
        if (typeof item === 'function') {
            return resolveAliasOrPath(item(ctx), baseDir, subDir, aliasMap, itemsAreFilePaths);
        } else {
            return resolveAliasOrPath([item], baseDir, subDir, aliasMap, itemsAreFilePaths);
        }
    });
}

export function resolveTargetStringList(itemsArray: (string | TargetListFunc)[], ctx: TargetBuildContext, itemsAreFilePaths: boolean): string[] {
    const aliasMap = util.buildAliasMap({
        project: ctx.project,
        config: ctx.config,
        target: ctx.target,
        selfDir: ctx.target.importDir
    });
    const baseDir = ctx.target.importDir;
    const subDir = ctx.target.dir;
    return itemsArray.flatMap((item) => {
        if (typeof item === 'function') {
            return resolveAliasOrPath(item(ctx), baseDir, subDir, aliasMap, itemsAreFilePaths);
        } else {
            return resolveAliasOrPath([item], baseDir, subDir, aliasMap, itemsAreFilePaths);
        }
    });
}

export type ResolvedTargetItems = {
    interface: string[];
    private: string[];
    public: string[];
}

export function resolveTargetItems(items: TargetItems, ctx: TargetBuildContext, itemsAreFilePaths: boolean): ResolvedTargetItems {
    return {
        interface: resolveTargetStringList(items.interface, ctx, itemsAreFilePaths),
        private: resolveTargetStringList(items.private, ctx, itemsAreFilePaths),
        public: resolveTargetStringList(items.public, ctx, itemsAreFilePaths),
    }
}

export function isTargetEnabled(project: Project, config: Config, target: Target): boolean {
    if (typeof target.enabled === 'function') {
        return target.enabled({ project, config });
    } else {
        return target.enabled;
    }
}
