import {
    Adapter,
    Config,
    ConfigDesc,
    ConfigDescWithImportDir,
    Job,
    Language,
    NamedItem,
    Project,
    Target,
    TargetArrayItems,
    TargetArrayItemsDesc,
    TargetDesc,
    TargetJob,
    TargetRecordItems,
    TargetRecordItemsDesc,
} from '../types.ts';
import { host, imports, log, settings, util } from '../lib/index.ts';

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
        imports: [],
        targets: [],
        commands: [],
        tools: [],
        jobs: [],
        runners: [],
        openers: [],
        configs: [],
        configDescs: [],
        adapters: [],
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
    project.configs = [];
    for (const desc of project.configDescs) {
        if (desc.ignore) {
            continue;
        }
        if (desc.inherits !== undefined) {
            resolveInheritedConfigDesc(desc, project.configDescs);
        }
        if (desc.platform === undefined) {
            log.panic(`config '${desc.name}' requires 'platform' field`);
        }
        if (desc.buildType === undefined) {
            log.panic(`config '${desc.name}' requires 'buildType' field`);
        }
        let runner = util.find(desc.runner ?? 'native', project.runners);
        if (runner === undefined) {
            log.panic(`config '${desc.name}' has unknown runner '${desc.runner}'`);
        }
        let opener = undefined;
        if (desc.opener !== undefined) {
            opener = util.find(desc.opener, project.openers);
            if (opener === undefined) {
                log.panic(`config '${desc.name}' has unknown opener '${desc.opener}'`);
            }
        }
        const config: Config = {
            name: desc.name,
            importDir: desc.importDir,
            platform: desc.platform,
            runner: runner,
            opener: opener,
            buildType: desc.buildType,
            generator: desc.generator,
            arch: desc.arch ?? undefined,
            toolchainFile: desc.toolchainFile,
            cmakeIncludes: desc.cmakeIncludes ?? [],
            cmakeVariables: desc.cmakeVariables ?? {},
            environment: desc.environment ?? {},
            options: desc.options ?? {},
            includeDirectories: desc.includeDirectories ?? [],
            compileDefinitions: desc.compileDefinitions ?? {},
            compileOptions: desc.compileOptions ?? [],
            linkOptions: desc.linkOptions ?? [],
            compilers: desc.compilers ?? ['unknown-compiler'],
            validate: desc.validate ?? (() => ({ valid: false, hints: ['no validate function set on config!'] })),
        };
        util.addOrReplace(project.configs, config);
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

function mergeRecordsMaybeUndefined<T>(
    into: Record<string, T> | undefined,
    src: Record<string, T> | undefined,
): Record<string, T> | undefined {
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
    // remove duplicates
    return [...new Set([...into, ...src])];
}

function mergeArrays<T>(into: T[], src: T[]): T[] {
    if (src === undefined) {
        return into;
    }
    // remove duplicates
    return [...new Set([...into, ...src])];
}

function cleanupUndefinedProperties<T>(obj: T) {
    for (let key in obj) {
        if (obj[key] === undefined) {
            delete obj[key];
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
    into.cmakeIncludes = mergeArraysMaybeUndefined(into.cmakeIncludes, from.cmakeIncludes);
    into.cmakeVariables = mergeRecordsMaybeUndefined(into.cmakeVariables, from.cmakeVariables);
    into.environment = mergeRecordsMaybeUndefined(into.environment, from.environment);
    into.options = mergeRecordsMaybeUndefined(into.options, from.options);
    into.includeDirectories = mergeArraysMaybeUndefined(into.includeDirectories, from.includeDirectories);
    into.compileDefinitions = mergeRecordsMaybeUndefined(into.compileDefinitions, from.compileDefinitions);
    into.compileOptions = mergeArraysMaybeUndefined(into.compileOptions, from.compileOptions);
    into.linkOptions = mergeArraysMaybeUndefined(into.linkOptions, from.linkOptions);
    into.compilers = assignMaybeUndefined(into.compilers, from.compilers);
    into.validate = assignMaybeUndefined(into.validate, from.validate);
    cleanupUndefinedProperties(into);
}

function mergeTransformArray<T0, T1>(
    into: T0[],
    from: T1[] | undefined,
    importDir: string,
    mergeTransformFunc: (into: T0[], src: T1, importDir: string) => void,
): T0[] {
    if (from !== undefined) {
        from.forEach((src) => mergeTransformFunc(into, src, importDir));
    }
    return into;
}

function integrateSimpleItem<T0 extends NamedItem, T1 extends NamedItem>(items: T0[], desc: T1, importDir: string) {
    const item: T0 = { importDir, ...desc } as unknown as T0;
    let into = util.find(desc.name, items);
    if (into === undefined) {
        items.push(item);
    } else {
        into = item;
    }
}

function integrateTarget(targets: Target[], desc: TargetDesc, importDir: string) {
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

    const into = util.find(desc.name, targets);
    const target: Target = {
        name: desc.name,
        importDir,
        dir: desc.dir,
        type: desc.type ?? 'plain-exe',
        enabled: desc.enabled ?? (() => true),
        sources: optionalToArray(desc.sources),
        deps: optionalToArray(desc.deps),
        libs: optionalToArray(desc.libs),
        includeDirectories: toTargetArrayItems(desc.includeDirectories),
        compileDefinitions: toTargetRecordItems(desc.compileDefinitions),
        compileOptions: toTargetArrayItems(desc.compileOptions),
        linkOptions: toTargetArrayItems(desc.linkOptions),
        jobs: optionalToArray(desc.jobs),
    };
    if (into === undefined) {
        targets.push(target);
    } else {
        into.type = assign(into.type, desc.type);
        into.dir = assign(into.dir, desc.dir);
        into.enabled = assign(into.enabled, desc.enabled);
        into.sources = mergeArrays(into.sources, target.sources);
        into.deps = mergeArrays(into.deps, target.deps);
        into.libs = mergeArrays(into.libs, target.libs);
        into.includeDirectories = mergeTargetArrayItems(into.includeDirectories, target.includeDirectories);
        into.compileDefinitions = mergeTargetRecordItems(into.compileDefinitions, target.compileDefinitions);
        into.compileOptions = mergeTargetArrayItems(into.compileOptions, target.compileOptions);
        into.linkOptions = mergeTargetArrayItems(into.linkOptions, target.linkOptions);
        into.jobs = mergeArrays(into.jobs, target.jobs);
    }
}

function integrateConfigDesc(configDescs: ConfigDescWithImportDir[], desc: ConfigDesc, importDir: string) {
    const into = util.find(desc.name, configDescs);
    const from: ConfigDescWithImportDir = { ...desc, importDir };
    if (into === undefined) {
        configDescs.push(from);
    } else {
        mergeConfigDescWithImportDir(into, from);
    }
}

async function integrateProjectDesc(into: Project, other: ProjectDesc, importDir: string) {
    // important to keep imports at the top!
    if (other.imports !== undefined) {
        for (const desc of other.imports) {
            const fetchResult = await imports.fetch(into, { name: desc.name, url: desc.url, ref: desc.ref });
            let importErrors: Error[] = [];
            if (fetchResult.valid) {
                const importResult = await imports.importProjects(fetchResult.dir, desc);
                importErrors = importResult.importErrors;
                for (const projDesc of importResult.projectDescs) {
                    await integrateProjectDesc(into, projDesc, fetchResult.dir);
                }
            }
            util.addOrReplace(into.imports, {
                name: desc.name,
                importErrors,
                importDir: fetchResult.dir,
                url: desc.url,
                ref: desc.ref,
            });
        }
    }
    into.configDescs = mergeTransformArray(into.configDescs, other.configs, importDir, integrateConfigDesc);
    into.cmakeVariables = mergeRecords(into.cmakeVariables, other.cmakeVariables);
    into.includeDirectories = mergeArrays(into.includeDirectories, optionalToArray(other.includeDirectories));
    into.compileDefinitions = mergeArrays(into.compileDefinitions, optionalToArray(other.compileDefinitions));
    into.compileOptions = mergeArrays(into.compileOptions, optionalToArray(other.compileOptions));
    into.linkOptions = mergeArrays(into.linkOptions, optionalToArray(other.linkOptions));
    into.commands = mergeTransformArray(into.commands, other.commands, importDir, integrateSimpleItem);
    into.tools = mergeTransformArray(into.tools, other.tools, importDir, integrateSimpleItem);
    into.jobs = mergeTransformArray(into.jobs, other.jobs, importDir, integrateSimpleItem);
    into.runners = mergeTransformArray(into.runners, other.runners, importDir, integrateSimpleItem);
    into.openers = mergeTransformArray(into.openers, other.openers, importDir, integrateSimpleItem);
    into.adapters = mergeTransformArray(into.adapters, other.adapters, importDir, integrateSimpleItem);
    into.targets = mergeTransformArray(into.targets, other.targets, importDir, integrateTarget);
    into.settings = mergeRecords(into.settings, other.settings);
}

function resolveInheritedConfigDesc(config: ConfigDescWithImportDir, configs: ConfigDescWithImportDir[]) {
    let inheritChain: ConfigDescWithImportDir[] = [];
    const maxInherits = 8;
    let curConfig = config;
    while (inheritChain.length < maxInherits) {
        inheritChain.unshift(curConfig);
        if (curConfig.inherits !== undefined) {
            const nextConfig = util.find(curConfig.inherits, configs);
            if (nextConfig === undefined) {
                log.panic(
                    `config '${curConfig.name}' tries to inherit from non-existing config '${curConfig.inherits}'`,
                );
            }
            curConfig = nextConfig;
        } else {
            break;
        }
    }
    if (inheritChain.length === maxInherits) {
        log.panic(`circular dependency in config '${config.name}'?`);
    }
    inheritChain.forEach((src) => mergeConfigDescWithImportDir(config, src));
}

export async function configure(
    project: Project,
    config: Config,
    adapter: Adapter,
    options: { buildTarget?: string; forceRebuild?: boolean },
): Promise<void> {
    await adapter.configure(project, config, options);
}

export async function build(
    project: Project,
    config: Config,
    adapter: Adapter,
    options: { buildTarget?: string; forceRebuild?: boolean },
): Promise<void> {
    await adapter.build(project, config, options);
}

export function validateTarget(
    project: Project,
    target: Target,
    options: { silent?: boolean; abortOnError?: boolean },
): { valid: boolean; hints: string[] } {
    const {
        silent = false,
        abortOnError = false,
    } = options;

    const res: ReturnType<typeof validateTarget> = { valid: true, hints: [] };

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
    const aliasMap = util.buildTargetAliasMap(project, config, target);
    const ctx: Context = {
        project,
        config,
        target,
        aliasMap,
        host: { platform: host.platform(), arch: host.arch() },
    };
    for (const targetJobFunc of target.jobs) {
        const targetJobs = util.arrayRemoveNullish(targetJobFunc(ctx));
        for (const targetJob of targetJobs) {
            const targetJobRes = validateTargetJob(project, config, target, targetJob);
            if (!targetJobRes.valid) {
                res.valid = false;
                res.hints.push(...targetJobRes.hints);
            }
        }
    }

    // check that dependencies exist as targets
    const deps = resolveTargetStringArray(target.deps, ctx, false);
    for (const dep of deps) {
        const depTarget = util.find(dep, project.targets);
        if (depTarget === undefined) {
            res.valid = false;
            res.hints.push(`dependency target not found: ${dep}`);
        } else {
            if ((depTarget.type === 'plain-exe') || (depTarget.type === 'windowed-exe')) {
                res.valid = false;
                res.hints.push(`dependency target is an executable: ${dep}`);
            }
        }
    }

    // check that lib names don't collide with target names
    const libs = resolveTargetStringArray(target.libs, ctx, false);
    for (const lib of libs) {
        if (util.find(lib, project.targets) !== undefined) {
            res.valid = false;
            res.hints.push(`library name collides with target: ${lib}`);
        }
    }

    // check that source files exist
    const srcDir = util.resolvePath(aliasMap, target.importDir, target.dir);
    if (!util.dirExists(srcDir)) {
        res.valid = false;
        res.hints.push(`src dir not found: ${srcDir}`);
    } else {
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
    for (const language of ['c', 'cxx']) {
        for (const compiler of config.compilers) {
            const ctx: Context = {
                project,
                config,
                target,
                compiler,
                language: language as Language,
                aliasMap,
                host: { platform: host.platform(), arch: host.arch() },
            };
            const resolvedItems = resolveTargetArrayItems(target.includeDirectories, ctx, true);
            missingIncludeDirectories.push(...checkMissingDirs(resolvedItems.interface));
            missingIncludeDirectories.push(...checkMissingDirs(resolvedItems.private));
            missingIncludeDirectories.push(...checkMissingDirs(resolvedItems.public));
        }
    }
    if (missingIncludeDirectories.length > 0) {
        // remove duplicates
        missingIncludeDirectories = [...new Set(missingIncludeDirectories)];
        res.valid = false;
        res.hints.push(...missingIncludeDirectories.map((dir) => `include directory not found: ${dir}`));
    }

    if (!res.valid && !silent) {
        const msg = [`target '${target.name} not valid:\n`, ...res.hints].join('\n  ') + '\n';
        if (abortOnError) {
            log.panic(msg);
        } else {
            log.warn(msg);
        }
    }
    return res;
}

export function validateTargetJob(
    project: Project,
    config: Config,
    target: Target,
    targetJob: TargetJob,
): { valid: boolean; hints: string[] } {
    const res: ReturnType<typeof validateTargetJob> = { valid: true, hints: [] };
    const jobName = targetJob.job;
    const jobTemplate = util.find(jobName, project.jobs);
    if (jobTemplate !== undefined) {
        const valRes = jobTemplate.validate(targetJob.args);
        if (!valRes.valid) {
            res.valid = false;
            res.hints.push(
                `job '${jobName}' in target '${target.name}' has invalid args:`,
                ...valRes.hints.map((hint) => `  - ${hint}`),
                'in:',
                ...JSON.stringify(targetJob.args, null, 2).split('\n').map((line) => `  ${line}`),
            );
        }
    } else {
        res.valid = false;
        res.hints.push(`unknown job '${jobName}' in target '${target.name}' (run 'fibs list jobs')`);
    }
    return res;
}

export function resolveTargetJobs(ctx: Context): Job[] {
    const targetJobs = util.arrayRemoveNullish(ctx.target!.jobs.flatMap((jobFunc) => jobFunc(ctx)));
    return targetJobs.map((targetJob) => {
        const res = validateTargetJob(ctx.project, ctx.config, ctx.target!, targetJob);
        if (!res.valid) {
            log.panic(
                `failed to validate job ${targetJob.job} in target ${ctx.target!.name}:\n${
                    res.hints.map((line) => `  ${line}\n`)
                }`,
            );
        }
        return util.find(targetJob.job, ctx.project.jobs)!.builder(targetJob.args)(ctx);
    });
}

export async function runJobs(project: Project, config: Config, target: Target) {
    const ctx: Context = {
        project,
        config,
        target,
        aliasMap: util.buildTargetAliasMap(project, config, target),
        host: { platform: host.platform(), arch: host.arch() },
    };
    const jobs = resolveTargetJobs(ctx);
    for (const job of jobs) {
        try {
            await job.func(job.inputs, job.outputs, job.args);
        } catch (err) {
            log.panic(`job '${job.name}' in target '${target.name}' failed with ${err}`);
        }
    }
}

function resolveAliasOrPath(
    item: string,
    baseDir: string,
    subDir: string | undefined,
    aliasMap: Record<string, string>,
    itemsAreFilePaths: boolean,
): string {
    if (itemsAreFilePaths) {
        return util.resolvePath(aliasMap, baseDir, subDir, item);
    } else {
        return util.resolveAlias(aliasMap, item);
    }
}

export function resolveProjectStringArray(
    array: StringArrayFunc[] | string[],
    ctx: Context,
    itemsAreFilePaths: boolean,
): string[] {
    const baseDir = ctx.project.dir;
    const subDir = undefined;
    return array.flatMap((funcOrString) => {
        if (typeof funcOrString === 'function') {
            return util.arrayRemoveNullish(funcOrString(ctx)).map((item) =>
                resolveAliasOrPath(item!, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths)
            );
        } else {
            return funcOrString
                ? [resolveAliasOrPath(funcOrString, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths)]
                : [];
        }
    }) as string[];
}

export function resolveProjectStringRecord(
    record: StringRecordFunc[] | Record<string, string>,
    ctx: Context,
    itemsAreFilePaths: boolean,
): Record<string, string> {
    const baseDir = ctx.project.dir;
    const subDir = undefined;
    const result: Record<string, string> = {};
    const resolve = (record: Record<string, string>) => {
        for (const [key, val] of Object.entries(record)) {
            result[key] = resolveAliasOrPath(val, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths);
        }
    };
    if (Array.isArray(record)) {
        record.forEach((func) => resolve(func(ctx) as Record<string, string>));
    } else {
        resolve(record);
    }
    return result;
}

export function resolveTargetStringArray(array: StringArrayFunc[], ctx: Context, itemsAreFilePaths: boolean): string[] {
    const baseDir = ctx.target!.importDir;
    const subDir = ctx.target!.dir;
    return array.flatMap((funcOrString) => {
        return util.arrayRemoveNullish(funcOrString(ctx)).map((item) =>
            resolveAliasOrPath(item, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths)
        );
    });
}

export function resolveTargetStringRecord(
    record: StringRecordFunc[],
    ctx: Context,
    itemsAreFilePaths: boolean,
): Record<string, string> {
    const baseDir = ctx.target!.importDir;
    const subDir = ctx.target!.dir;
    const result: Record<string, string> = {};
    const resolve = (record: Record<string, string>) => {
        for (const [key, val] of Object.entries(record)) {
            result[key] = resolveAliasOrPath(val, baseDir, subDir, ctx.aliasMap, itemsAreFilePaths);
        }
    };
    record.forEach((func) => resolve(func(ctx) as Record<string, string>));
    return result;
}

export function resolveTargetArrayItems(
    items: TargetArrayItems,
    ctx: Context,
    itemsAreFilePaths: boolean,
): { interface: string[]; private: string[]; public: string[] } {
    return {
        interface: resolveTargetStringArray(items.interface, ctx, itemsAreFilePaths),
        private: resolveTargetStringArray(items.private, ctx, itemsAreFilePaths),
        public: resolveTargetStringArray(items.public, ctx, itemsAreFilePaths),
    };
}

export function resolveTargetRecordItems(
    items: TargetRecordItems,
    ctx: Context,
    itemsAreFilePaths: boolean,
): { interface: Record<string, string>; private: Record<string, string>; public: Record<string, string> } {
    return {
        interface: resolveTargetStringRecord(items.interface, ctx, itemsAreFilePaths),
        private: resolveTargetStringRecord(items.private, ctx, itemsAreFilePaths),
        public: resolveTargetStringRecord(items.public, ctx, itemsAreFilePaths),
    };
}

export function isTargetEnabled(project: Project, config: Config, target: Target): boolean {
    return target.enabled({
        project,
        config,
        target,
        aliasMap: util.buildTargetAliasMap(project, config, target),
        host: { platform: host.platform(), arch: host.arch() },
    });
}
