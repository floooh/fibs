import {
    Adapter,
    AdapterDesc,
    AdapterOptions,
    Config,
    ConfigDesc,
    ConfigDescWithImportDir,
    Job,
    Language,
    Project,
    ProjectDesc,
    StringArrayFunc,
    StringRecordFunc,
    Context,
    Target,
    TargetDesc,
    TargetArrayItems,
    TargetArrayItemsDesc,
    TargetRecordItems,
    TargetRecordItemsDesc,
    TargetJob,
    TargetJobDesc,
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
        cmakeVariables: {},
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
            compileDefinitions: desc.compileDefinitions ?? {},
            compileOptions: desc.compileOptions ?? [],
            linkOptions: desc.linkOptions ?? [],
        };
        project.configs[name] = config;
    }
}

function optionalToArray<T>(val: T | undefined): T[] {
    return (val === undefined) ? [] : [val];
}

function assignMaybeUndefined<T>(into: T | undefined, src: T | undefined): T | undefined {
    return (src === undefined) ? into : src;
}

function assign<T>(into: T, src: T | undefined): T {
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

function mergeRecords<T>(into: Record<string, T>, src: Record<string, T> | undefined): Record<string, T> {
    if (src === undefined) {
        return into;
    }
    return Object.assign(into, src);
}

function mergeArraysMaybeUndefined<T>(into: T[] | undefined, src: T[] | undefined): T[] | undefined {
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

function mergeArrays<T>(into: T[], src: T[]): T[] {
    if (src === undefined) {
        return into;
    }
    return [...into, ...src];
}

function cleanupUndefinedProperties<T>(obj: T) {
    let key: keyof typeof obj;
    for (key in obj) {
        if (obj[key] === undefined) {
            delete obj[key]
        }
    }
}

function mergeConfigDescWithImportDir(into: ConfigDescWithImportDir, from: ConfigDescWithImportDir) {
    into.ignore = assignMaybeUndefined(into.ignore, from.ignore);
    into.inherits = assignMaybeUndefined(into.inherits, from.inherits);
    into.platform = assignMaybeUndefined(into.platform, from.platform);
    into.runner = assignMaybeUndefined(into.runner, from.runner);
    into.opener = assignMaybeUndefined(into.opener, from.opener);
    into.buildType = assignMaybeUndefined(into.buildType, from.buildType);
    into.generator = assignMaybeUndefined(into.generator, from.generator);
    into.arch = assignMaybeUndefined(into.arch, from.arch);
    into.toolchainFile = assignMaybeUndefined(into.toolchainFile, from.toolchainFile);
    into.cmakeVariables = mergeRecordsMaybeUndefined(into.cmakeVariables, from.cmakeVariables);
    into.environment = mergeRecordsMaybeUndefined(into.environment, from.environment);
    into.options = mergeRecordsMaybeUndefined(into.options, from.options);
    into.includeDirectories = mergeArraysMaybeUndefined(into.includeDirectories, from.includeDirectories);
    into.compileDefinitions = mergeRecordsMaybeUndefined(into.compileDefinitions, from.compileDefinitions);
    into.compileOptions = mergeArraysMaybeUndefined(into.compileOptions, from.compileOptions);
    into.linkOptions = mergeArraysMaybeUndefined(into.linkOptions, from.linkOptions);
    cleanupUndefinedProperties(into);
}

function mergeTransformRecord<T0, T1>(
    into: Record<string, T0>,
    from: Record<string, T1> | undefined,
    importDir: string,
    mergeTransformFunc: (into: Record<string, T0>, name: string, importDir: string, src: T1) => void)
    : Record<string, T0>
{
    if (from !== undefined) {
        for (const [name, desc] of Object.entries(from)) {
            mergeTransformFunc(into, name, importDir, desc);
        }
    }
    return into;
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

function integrateTarget(intoRecord: Record<string, Target>, name: string, importDir: string, desc: TargetDesc) {
    const toTargetArrayItems = (desc: TargetArrayItemsDesc | undefined): TargetArrayItems => ({
        interface: optionalToArray(desc?.interface),
        private: optionalToArray(desc?.private),
        public: optionalToArray(desc?.public),
    });
    const toTargetRecordItems = (desc: TargetRecordItemsDesc | undefined): TargetRecordItems => ({
        interface: optionalToArray(desc?.interface),
        private: optionalToArray(desc?.private),
        public: optionalToArray(desc?.public),
    });
    const toTargetJobs = (descs: TargetJobDesc[] | undefined): TargetJob[] => {
        if (descs === undefined) {
            return [];
        }
        return descs.map((desc) => ({job: desc.job, args: desc.args}));
    };
    const mergeTargetArrayItems = (into: TargetArrayItems, src: TargetArrayItems): TargetArrayItems => {
        return {
            interface: mergeArrays(into.interface, src.interface),
            private: mergeArrays(into.private, src.private),
            public: mergeArrays(into.public, src.public),
        };
    };
    const mergeTargetRecordItems = (into: TargetRecordItems, src: TargetRecordItems): TargetRecordItems => {
        return {
            interface: mergeArrays(into.interface, src.interface),
            private: mergeArrays(into.private, src.private),
            public: mergeArrays(into.public, src.public),
        };
    };

    const into = intoRecord[name];
    const from: Target = {
        name,
        importDir,
        dir: desc.dir,
        type: desc.type ?? 'plain-exe',
        enabled: desc.enabled ?? (() => true),
        sources: optionalToArray(desc.sources),
        libs: optionalToArray(desc.libs),
        includeDirectories: toTargetArrayItems(desc.includeDirectories),
        compileDefinitions: toTargetRecordItems(desc.compileDefinitions),
        compileOptions: toTargetArrayItems(desc.compileOptions),
        linkOptions: toTargetArrayItems(desc.linkOptions),
        jobs: toTargetJobs(desc.jobs),
    }
    if (into === undefined) {
        intoRecord[name] = from;
    } else {
        into.type = assign(into.type, desc.type);
        into.dir = assign(into.dir, desc.dir);
        into.enabled = assign(into.enabled, desc.enabled);
        into.sources = mergeArrays(into.sources, from.sources);
        into.libs = mergeArrays(into.libs, from.libs);
        into.includeDirectories = mergeTargetArrayItems(into.includeDirectories, from.includeDirectories);
        into.compileDefinitions = mergeTargetRecordItems(into.compileDefinitions, from.compileDefinitions);
        into.compileOptions = mergeTargetArrayItems(into.compileOptions, from.compileOptions);
        into.linkOptions = mergeTargetArrayItems(into.linkOptions, from.linkOptions);
        into.jobs = mergeArrays(into.jobs, from.jobs);
    }
}

function integrateConfigDesc(intoRecord: Record<string, ConfigDescWithImportDir>, name: string, importDir: string, desc: ConfigDesc) {
    const into = intoRecord[name];
    const from: ConfigDescWithImportDir = { ...desc, importDir };
    if (into === undefined) {
        intoRecord[name] = from;
    } else {
        mergeConfigDescWithImportDir(into, from);
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
    into.configDescs = mergeTransformRecord(into.configDescs, other.configs, importDir, integrateConfigDesc);
    into.cmakeVariables = mergeRecords(into.cmakeVariables, other.cmakeVariables);
    into.includeDirectories = mergeArrays(into.includeDirectories, optionalToArray(other.includeDirectories));
    into.compileDefinitions = mergeArrays(into.compileDefinitions, optionalToArray(other.compileDefinitions));
    into.compileOptions = mergeArrays(into.compileOptions, optionalToArray(other.compileOptions));
    into.linkOptions = mergeArrays(into.linkOptions, optionalToArray(other.linkOptions));
    into.commands = mergeTransformRecord(into.commands, other.commands, importDir, integrateCommand);
    into.tools = mergeTransformRecord(into.tools, other.tools, importDir, integrateTool);
    into.jobs = mergeTransformRecord(into.jobs, other.jobs, importDir, integrateJobTemplate)
    into.runners = mergeTransformRecord(into.runners, other.runners, importDir, integrateRunner);
    into.openers = mergeTransformRecord(into.openers, other.openers, importDir, integrateOpener);
    into.adapters = mergeTransformRecord(into.adapters, other.adapters, importDir, integrateAdapter);
    into.targets = mergeTransformRecord(into.targets, other.targets, importDir, integrateTarget);
    into.settings = mergeRecords(into.settings, other.settings);
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
        mergeConfigDescWithImportDir(into, src);
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
        const check = (items: TargetArrayItems | TargetRecordItems): boolean => {
            if (items.private.length > 0) {
                return false;
            }
            if (items.public.length > 0) {
                return false;
            }
            return true;
        };
        if ((target.sources.length > 0)) {
            res.valid = false;
            res.hints.push(`target type 'interface' cannot have source files attached`);
        }
        if (!check(target.includeDirectories)) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface include directories`);
        }
        if (!check(target.compileDefinitions)) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface compile definitins`);
        }
        if (!check(target.compileOptions)) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface compile options`);
        }
        if (!check(target.linkOptions)) {
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
    const aliasMap = util.buildTargetAliasMap(project, config, target);
    const srcDir = util.resolvePath(aliasMap, target.importDir, target.dir);
    if (!util.dirExists(srcDir)) {
        res.valid = false;
        res.hints.push(`src dir not found: ${srcDir}`);
    } else {
        const ctx: Context = { project, config, target, aliasMap };
        const sources = resolveTargetStringArray(target.sources, ctx, true);
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
            const ctx: Context = {
                project,
                config,
                target,
                compiler,
                language: language as Language,
                aliasMap,
            };
            const resolvedItems = resolveTargetArrayItems(target.includeDirectories, ctx, true);
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

export function resolveJob(ctx: Context, targetJob: TargetJob): Job {
    const res = validateTargetJob(ctx.project, ctx.config, ctx.target!, targetJob);
    if (!res.valid) {
        log.error(`failed to validate job ${targetJob.job} in target ${ctx.target!.name}:\n${res.hints.map((line) => `  ${line}\n`)}`);
    }
    return ctx.project.jobs[targetJob.job].builder(targetJob.args)(ctx);
}

export async function runJobs(project: Project, config: Config, target: Target): Promise<boolean> {
    const ctx: Context = {
        project,
        config,
        target,
        aliasMap: util.buildTargetAliasMap(project, config, target),
    };
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

function resolveAliasOrPath(item: string, baseDir: string, subDir: string | undefined, aliasMap: Record<string, string>, itemsAreFilePaths: boolean): string {
    if (itemsAreFilePaths) {
        return util.resolvePath(aliasMap, baseDir, subDir, item);
    } else {
        return util.resolveAlias(aliasMap, item);
    }
}

function removeNullish(array: (string|undefined|null)[]): string[] {
    return array.filter((item) => item) as string[];
}

export function resolveProjectStringArray(array: StringArrayFunc[] | string[], ctx: Context, itemsAreFilePaths: boolean): string[] {
    const baseDir = ctx.project.dir;
    const subDir = undefined;
    return array.flatMap((funcOrString) => {
        if (typeof funcOrString === 'function') {
            return removeNullish(funcOrString(ctx)).map((item) => resolveAliasOrPath(item!, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths));
        } else {
            return funcOrString ? [ resolveAliasOrPath(funcOrString, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths) ] : [];
        }
    }) as string[];
}

export function resolveProjectStringRecord(record: StringRecordFunc[] | Record<string,string>, ctx: Context, itemsAreFilePaths: boolean): Record<string, string> {
    const baseDir = ctx.project.dir;
    const subDir = undefined;
    const result: Record<string, string> = {};
    const resolve = (record: Record<string,string>) => {
        for (const [key,val] of Object.entries(record)) {
            result[key] = resolveAliasOrPath(val, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths);
        }
    }
    if (Array.isArray(record)) {
        record.forEach((func) => resolve(func(ctx) as Record<string,string>));
    } else {
        resolve(record);
    }
    return result;
}

export function resolveTargetStringArray(array: StringArrayFunc[], ctx: Context, itemsAreFilePaths: boolean): string[] {
    const baseDir = ctx.target!.importDir;
    const subDir = ctx.target!.dir;
    return array.flatMap((funcOrString) => {
        return removeNullish(funcOrString(ctx)).filter((item) => item).map((item) => resolveAliasOrPath(item!, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths));
    });
}

export function resolveTargetStringRecord(record: StringRecordFunc[], ctx: Context, itemsAreFilePaths: boolean): Record<string,string> {
    const baseDir = ctx.target!.importDir;
    const subDir = ctx.target!.dir;
    const result: Record<string, string> = {};
    const resolve = (record: Record<string,string>) => {
        for (const [key,val] of Object.entries(record)) {
            result[key] = resolveAliasOrPath(val, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths);
        }
    }
    record.forEach((func) => resolve(func(ctx) as Record<string,string>));
    return result;
}

export type ResolvedTargetArrayItems = {
    interface: string[];
    private: string[];
    public: string[];
}

export function resolveTargetArrayItems(items: TargetArrayItems, ctx: Context, itemsAreFilePaths: boolean): ResolvedTargetArrayItems {
    return {
        interface: resolveTargetStringArray(items.interface, ctx, itemsAreFilePaths),
        private: resolveTargetStringArray(items.private, ctx, itemsAreFilePaths),
        public: resolveTargetStringArray(items.public, ctx, itemsAreFilePaths),
    }
}

export type ResolvedTargetRecordItems = {
    interface: Record<string,string>;
    private: Record<string,string>;
    public: Record<string,string>;
}

export function resolveTargetRecordItems(items: TargetRecordItems, ctx: Context, itemsAreFilePaths: boolean): ResolvedTargetRecordItems {
    return {
        interface: resolveTargetStringRecord(items.interface, ctx, itemsAreFilePaths),
        private: resolveTargetStringRecord(items.private, ctx, itemsAreFilePaths),
        public: resolveTargetStringRecord(items.public, ctx, itemsAreFilePaths),
    }
}

export function isTargetEnabled(project: Project, config: Config, target: Target): boolean {
    return target.enabled({
        project,
        config,
        target,
        aliasMap: util.buildTargetAliasMap(project, config, target)
    });
}
