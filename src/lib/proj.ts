import { host, log, settings, util } from './index.ts';
import {
    Adapter,
    CmakeInclude,
    CmakeVariable,
    Command,
    CompileDefinition,
    CompileOption,
    Config,
    FibsModule,
    Import,
    IncludeDirectory,
    JobBuilder,
    LinkOption,
    Opener,
    Project,
    Runner,
    Setting,
    Target,
    TargetDesc,
    TargetJob,
    Tool,
} from '../types.ts';
import { ProjectImpl } from '../impl/project.ts';
import { ConfigurerImpl } from '../impl/configurer.ts';
import { BuilderImpl } from '../impl/builder.ts';
import { builtinAdapters } from '../adapters/index.ts';
import { builtinConfigs } from '../configs/index.ts';
import { builtinOpeners } from '../openers/index.ts';
import { builtinRunners } from '../runners/index.ts';
import { builtinTools } from '../tools/index.ts';
import { builtinCommands } from '../commands/index.ts';
import { fetchImport, importModulesFromDir } from './imports.ts';

let projectImpl: ProjectImpl;

export async function configure(rootModule: FibsModule, rootDir: string, withTargets: boolean): Promise<Project> {
    projectImpl = new ProjectImpl(rootModule, rootDir);
    await doConfigure(rootModule, projectImpl);
    if (withTargets) {
        await configureTargets();
    }
    return projectImpl;
}

export async function generate(): Promise<void> {
    await configureTargets();
    const adapter = projectImpl.adapter('cmake');
    const config = projectImpl.activeConfig();
    await adapter.generate(projectImpl, config);
}

export async function build(options: { buildTarget?: string; forceRebuild?: boolean }): Promise<void> {
    const { buildTarget, forceRebuild } = options;
    const adapter = projectImpl.adapter('cmake');
    const config = projectImpl.activeConfig();
    await adapter.build(projectImpl, config, { buildTarget, forceRebuild });
}

async function configureTargets(): Promise<void> {
    const adapter = projectImpl.adapter('cmake');
    const config = projectImpl.activeConfig();
    const configRes = await adapter.configure(projectImpl, config);
    projectImpl._compiler = configRes.compiler;
    doBuildSetup(projectImpl, config);
}

export function validateTarget(
    project: Project,
    target: Target,
    options: { silent?: boolean; abortOnError?: boolean },
): { valid: boolean; hints: string[] } {
    const { silent = false, abortOnError = false } = options;
    const res: ReturnType<typeof validateTarget> = { valid: true, hints: [] };

    // check restrictions for interface targets
    if (target.type === 'interface') {
        if ((target.sources.length > 0)) {
            res.valid = false;
            res.hints.push(`target type 'interface' cannot have source files attached`);
        }
        if (target.includeDirectories.some((item) => item.scope !== 'interface')) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface include directories`);
        }
        if (target.compileDefinitions.some((item) => item.scope !== 'interface')) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface compile definitins`);
        }
        if (target.compileOptions.some((item) => item.scope !== 'interface')) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface compile options`);
        }
        if (target.linkOptions.some((item) => item.scope !== 'interface')) {
            res.valid = false;
            res.hints.push(`interface targets must only define interface link options`);
        }
    }

    // check that jobs exist and have valid arg types
    for (const targetJob of target.jobs) {
        const targetJobRes = validateTargetJob(project, target, targetJob);
        if (!targetJobRes.valid) {
            res.valid = false;
            res.hints.push(...targetJobRes.hints);
        }
    }

    // check that dependencies exist as targets
    for (const dep of target.deps) {
        const depTarget = util.find(dep, project.targets());
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
    for (const lib of target.libs) {
        if (util.find(lib, project.targets()) !== undefined) {
            res.valid = false;
            res.hints.push(`library name collides with target: ${lib}`);
        }
    }

    // check that source files exist
    for (const src of target.sources) {
        if (!util.fileExists(src)) {
            res.valid = false;
            res.hints.push(`src file not found: ${src}`);
        }
    }

    // check that include directories exist
    for (const idir of target.includeDirectories) {
        if (!util.dirExists(idir.dir)) {
            res.valid = false;
            res.hints.push(`include directory not found: ${idir.dir}`);
        }
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
    target: Target,
    targetJob: TargetJob,
): { valid: boolean; hints: string[] } {
    const res: ReturnType<typeof validateTargetJob> = { valid: true, hints: [] };
    const jobName = targetJob.job;
    const jobTemplate = util.find(jobName, project.jobs());
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

export async function runJobs(_target: Target) {
    log.info(`proj.runJobs() called`);
    /* FIXME
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
    */
}

async function doConfigure(rootModule: FibsModule, project: ProjectImpl): Promise<void> {
    const configurers: ConfigurerImpl[] = [];

    // start configuration at the root object to gather imports
    const rootConfigurer = new ConfigurerImpl(project.dir(), project.dir());
    if (rootModule.configure) {
        rootModule.configure(rootConfigurer);
    }
    configurers.push(rootConfigurer);

    // next recurse into imported modules
    await configureRecurseImports(rootConfigurer, project, configurers);

    // finally configure the builtins
    configurers.push(configureBuiltins(project));

    // resolve needs to happen in reverse order, this allows the builtin config to be
    // overridden by imports, and imports to be overridden by the root project
    configurers.reverse();
    project._settings = resolveSettings(configurers);
    project._imports = resolveImports(configurers);
    project._commands = resolveCommands(configurers);
    project._jobs = resolveJobs(configurers);
    project._tools = resolveTools(configurers);
    project._runners = resolveRunners(configurers);
    project._openers = resolveOpeners(configurers);
    project._adapters = resolveAdapters(configurers);
    project._configs = resolveConfigs(configurers, project);
    // load the active config before resolving import options!
    settings.load(project);
    // resolving config options needs to happen after active config is known
    project._importOptions = resolveImportOptions(configurers, project);
}

function configureBuiltins(project: ProjectImpl): ConfigurerImpl {
    const configurer = new ConfigurerImpl(project.dir(), project.dir());
    configurer.addSetting({
        name: 'config',
        default: host.defaultConfig(),
        validate: () => ({ valid: true, hint: '' }),
    });
    builtinCommands.forEach((command) => configurer.addCommand(command));
    builtinAdapters.forEach((adapter) => configurer.addAdapter(adapter));
    builtinConfigs.forEach((config) => configurer.addConfig(config));
    builtinOpeners.forEach((opener) => configurer.addOpener(opener));
    builtinRunners.forEach((runner) => configurer.addRunner(runner));
    builtinTools.forEach((tool) => configurer.addTool(tool));
    return configurer;
}

// FIXME: detect import cycles!
async function configureRecurseImports(
    configurer: ConfigurerImpl,
    project: ProjectImpl,
    res: ConfigurerImpl[],
): Promise<void> {
    for (const importDesc of configurer._imports) {
        const { name, url, ref } = importDesc;
        const { valid, dir } = await fetchImport(project, { name, url, ref });
        // record the actual importDir in the parent ImportDesc
        importDesc.importDir = dir;
        importDesc.importModules = [];
        if (valid) {
            const { modules, importErrors } = await importModulesFromDir(dir, importDesc);
            for (const module of modules) {
                // record the actual import modules in the parent importDesc
                importDesc.importModules.push(module);
                const childConfigurer = new ConfigurerImpl(project.dir(), dir);
                childConfigurer._importErrors = importErrors;
                res.push(childConfigurer);
                if (module.configure) {
                    module.configure(childConfigurer);
                }
                configureRecurseImports(childConfigurer, project, res);
            }
        }
    }
}

function doBuildSetup(project: ProjectImpl, config: Config): void {
    const builders: BuilderImpl[] = [];
    for (const imp of projectImpl.imports()) {
        for (const module of imp.modules) {
            if (module.build) {
                const builder = new BuilderImpl(project, imp.importDir);
                module.build(builder);
                builders.push(builder);
            }
        }
    }
    if (projectImpl._rootModule.build) {
        const builder = new BuilderImpl(project, projectImpl._rootDir);
        projectImpl._rootModule.build(builder);
        // root module builder defines the project name
        if (builder._name) {
            projectImpl._name = builder._name;
        }
        builders.push(builder);
    } else {
        log.panic(`root project fibs.ts must export a 'build' function`);
    }
    project._includeDirectories = resolveBuilderIncludeDirectories(builders, project);
    project._compileDefinitions = resolveBuilderCompileDefinitions(builders);
    project._compileOptions = resolveBuilderCompileOptions(builders);
    project._linkOptions = resolveBuilderLinkOptions(builders);
    project._cmakeVariables = resolveCmakeVariables(builders, project);
    project._cmakeIncludes = resolveCmakeIncludes(builders, project);
    project._targets = resolveTargets(builders, project, config);
}

function resolveSettings(configurers: ConfigurerImpl[]): Setting[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer._settings.map((s) => ({
            name: s.name,
            importDir: configurer._importDir,
            default: s.default,
            value: s.default, // not a bug
            validate: s.validate,
        }))
    ));
}

function resolveImports(configurers: ConfigurerImpl[]): Import[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer._imports.map<Import>((i) => ({
            name: i.name,
            importDir: i.importDir ?? 'no-import-dir',
            importErrors: configurer._importErrors,
            url: i.url,
            ref: i.ref,
            modules: i.importModules ?? [],
            options: {},
        }))
    ));
}

function resolveCommands(configurers: ConfigurerImpl[]): Command[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer._commands.map((c) => ({
            name: c.name,
            importDir: configurer._importDir,
            help: c.help,
            run: c.run,
        }))
    ));
}

function resolveJobs(configurers: ConfigurerImpl[]): JobBuilder[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer._jobs.map((j) => ({
            name: j.name,
            importDir: configurer._importDir,
            help: j.help,
            validate: j.validate,
            build: j.build,
        }))
    ));
}

function resolveTools(configurers: ConfigurerImpl[]): Tool[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer._tools.map((t) => ({
            name: t.name,
            importDir: configurer._importDir,
            platforms: t.platforms,
            optional: t.optional,
            notFoundMsg: t.notFoundMsg,
            exists: t.exists,
        }))
    ));
}

function resolveRunners(configurers: ConfigurerImpl[]): Runner[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer._runners.map((r) => ({
            name: r.name,
            importDir: configurer._importDir,
            run: r.run,
        }))
    ));
}

function resolveOpeners(configurers: ConfigurerImpl[]): Opener[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer._openers.map((o) => ({
            name: o.name,
            importDir: configurer._importDir,
            generate: o.generate,
            open: o.open,
        }))
    ));
}

function resolveAdapters(configurers: ConfigurerImpl[]): Adapter[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer._adapters.map((a) => ({
            name: a.name,
            importDir: configurer._importDir,
            generate: a.generate,
            configure: a.configure,
            build: a.build,
        }))
    ));
}

function resolveConfigs(configurers: ConfigurerImpl[], project: ProjectImpl): Config[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer._configs.map((c) => ({
            name: c.name,
            importDir: configurer._importDir,
            platform: c.platform,
            buildMode: c.buildMode,
            runner: project.findRunner(c.runner) ?? project.runner('native'),
            opener: project.findOpener(c.opener),
            generator: c.generator,
            arch: c.arch,
            toolchainFile: c.toolchainFile
                ? util.resolveConfigScopePath(c.toolchainFile, {
                    rootDir: project.dir(),
                    config: { name: c.name, platform: c.platform, importDir: configurer._importDir },
                })
                : undefined,
            environment: c.environment ?? {},
            options: c.options ?? {},
            compilers: c.compilers ?? [],
            validate: c.validate ?? (() => ({ valid: true, hints: [] })),
        }))
    ));
}

function resolveImportOptions(configurers: ConfigurerImpl[], project: ProjectImpl): Record<string, unknown> {
    let res: Record<string, unknown> = {};
    configurers.forEach((configurer) => {
        configurer._importOptionsFuncs.forEach((func) => {
            res = { ...res, ...func(project) };
        });
    });
    return res;
}

function resolveBuilderIncludeDirectories(builders: BuilderImpl[], project: ProjectImpl): IncludeDirectory[] {
    return builders.flatMap((builder) =>
        builder._includeDirectories.flatMap((items) =>
            items.dirs.map((dir) => ({
                dir: util.resolveModuleScopePath(dir, {
                    rootDir: project._rootDir,
                    defaultAlias: '@self',
                    moduleDir: builder._importDir,
                }),
                importDir: builder._importDir,
                scope: items.scope ?? 'public',
                system: items.system ?? false,
                language: items.language,
                buildMode: items.buildMode,
            }))
        )
    );
}

function resolveTargetIncludeDirectories(
    builder: BuilderImpl,
    project: ProjectImpl,
    config: Config,
    t: TargetDesc,
): IncludeDirectory[] {
    if (t.includeDirectories === undefined) {
        return [];
    }
    return t.includeDirectories.flatMap((items) =>
        items.dirs.map((dir) => ({
            dir: util.resolveTargetScopePath(dir, {
                rootDir: project._rootDir,
                defaultAlias: '@targetdir',
                config: { name: config.name, platform: config.platform },
                target: { name: t.name, dir: t.dir, type: t.type, importDir: builder._importDir },
            }),
            importDir: builder._importDir,
            scope: items.scope ?? 'public',
            system: items.system ?? false,
            language: items.language,
            buildMode: items.buildMode,
        }))
    );
}

function resolveBuilderCompileDefinitions(builders: BuilderImpl[]): CompileDefinition[] {
    return util.deduplicate(
        builders.flatMap((builder) =>
            builder._compileDefinitions.flatMap((items) =>
                Object.entries(items.defs).map(([key, val]) => ({
                    name: key,
                    val,
                    scope: items.scope ?? 'public',
                    language: items.language,
                    buildMode: items.buildMode,
                    importDir: builder._importDir,
                }))
            )
        ),
    );
}

function resolveTargetCompileDefinitions(builder: BuilderImpl, t: TargetDesc): CompileDefinition[] {
    if (t.compileDefinitions === undefined) {
        return [];
    }
    return util.deduplicate(t.compileDefinitions.flatMap((items) =>
        Object.entries(items.defs).map(([key, val]) => ({
            name: key,
            val,
            scope: items.scope ?? 'public',
            language: items.language,
            buildMode: items.buildMode,
            importDir: builder._importDir,
        }))
    ));
}

function resolveBuilderCompileOptions(builders: BuilderImpl[]): CompileOption[] {
    return builders.flatMap((builder) =>
        builder._compileOptions.flatMap((items) =>
            items.opts.map((opt) => ({
                opt,
                scope: items.scope ?? 'public',
                language: items.language,
                buildMode: items.buildMode,
                importDir: builder._importDir,
            }))
        )
    );
}

function resolveTargetCompileOptions(builder: BuilderImpl, t: TargetDesc): CompileOption[] {
    if (t.compileOptions === undefined) {
        return [];
    }
    return t.compileOptions.flatMap((items) =>
        items.opts.map((opt) => ({
            opt,
            scope: items.scope ?? 'public',
            language: items.language,
            buildMode: items.buildMode,
            importDir: builder._importDir,
        }))
    );
}

function resolveBuilderLinkOptions(builders: BuilderImpl[]): LinkOption[] {
    return builders.flatMap((builder) =>
        builder._linkOptions.flatMap((items) =>
            items.opts.map((opt) => ({
                opt,
                scope: items.scope ?? 'public',
                importDir: builder._importDir,
            }))
        )
    );
}

function resolveTargetLinkOptions(builder: BuilderImpl, t: TargetDesc): LinkOption[] {
    if (t.linkOptions === undefined) {
        return [];
    }
    return t.linkOptions.flatMap((items) =>
        items.opts.map((opt) => ({
            opt,
            scope: items.scope ?? 'public',
            importDir: builder._importDir,
        }))
    );
}

function resolveTargetSources(builder: BuilderImpl, project: ProjectImpl, config: Config, t: TargetDesc): string[] {
    return t.sources.map((src) =>
        util.resolveTargetScopePath(src, {
            rootDir: project._rootDir,
            defaultAlias: '@targetdir',
            config: { name: config.name, platform: config.platform },
            target: { name: t.name, dir: t.dir, type: t.type, importDir: builder._importDir },
        })
    );
}

function resolveTargets(builders: BuilderImpl[], project: ProjectImpl, config: Config): Target[] {
    return util.deduplicate(builders.flatMap((builder) =>
        builder._targets.map((t) => ({
            name: t.name,
            importDir: builder._importDir,
            type: t.type,
            dir: t.dir,
            sources: resolveTargetSources(builder, project, config, t),
            deps: t.deps ?? [],
            libs: t.libs ?? [],
            frameworks: t.frameworks ?? [],
            includeDirectories: resolveTargetIncludeDirectories(builder, project, config, t),
            compileDefinitions: resolveTargetCompileDefinitions(builder, t),
            compileOptions: resolveTargetCompileOptions(builder, t),
            linkOptions: resolveTargetLinkOptions(builder, t),
            jobs: t.jobs ?? [],
        }))
    ));
}

function resolveCmakeVariables(builders: BuilderImpl[], project: ProjectImpl): CmakeVariable[] {
    return util.deduplicate(builders.flatMap((builder) =>
        builder._cmakeVariables.map((v) => ({
            name: v.name,
            importDir: builder._importDir,
            value: (typeof v.value !== 'string') ? v.value : util.resolveModuleScopePath(v.value, {
                rootDir: project.dir(),
                moduleDir: builder._importDir,
            }),
        }))
    ));
}

function resolveCmakeIncludes(builders: BuilderImpl[], project: ProjectImpl): CmakeInclude[] {
    return builders.flatMap((builder) =>
        builder._cmakeIncludes.map((path) => ({
            importDir: builder._importDir,
            path: util.resolveModuleScopePath(path, {
                rootDir: project.dir(),
                defaultAlias: '@self',
                moduleDir: builder._importDir,
            }),
        }))
    );
}
