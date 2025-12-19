import { host, log, settings, util } from './index.ts';
import {
    Adapter,
    CmakeVariable,
    Command,
    CompileDefinition,
    CompileOption,
    Config,
    ConfigDesc,
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

export async function configure(rootModule: FibsModule, rootDir: string): Promise<Project> {
    projectImpl = new ProjectImpl(rootModule, rootDir);
    await doConfigure(rootModule, projectImpl);
    await generateTargets();
    return projectImpl;
}

export async function generateTargets(): Promise<void> {
    const adapter = projectImpl.adapter('cmake');
    const config = projectImpl.activeConfig();
    const configRes = await adapter.configure(projectImpl, config);
    projectImpl._compiler = configRes.compiler;
    await doBuildSetup(projectImpl, config);
}

export async function generate(): Promise<void> {
    await generateTargets();
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

export function validateTarget(
    project: Project,
    target: Target,
    config: Config,
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
        const targetJobRes = validateTargetJob(project, config, target, targetJob);
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
    config: Config,
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

export async function runJobs(target: Target) {
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
    const rootConfigurer = new ConfigurerImpl(project.dir(), project.dir(), rootModule);
    if (rootModule.configure) {
        rootModule.configure(rootConfigurer);
    }
    configurers.push(rootConfigurer);

    // next recurse into imported modules
    await configureRecurseImports(rootConfigurer, project, configurers);

    // finally configure the builtins
    configurers.push(configureBuiltins(rootModule, project));

    resolveConfigureItems(configurers, project);
    settings.load(project);
}

function configureBuiltins(module: FibsModule, project: ProjectImpl): ConfigurerImpl {
    const configurer = new ConfigurerImpl(project.dir(), project.dir(), module);
    configurer.addSetting({
        name: 'config',
        default: host.defaultConfig(),
        validate: () => ({ valid: true, hint: '' }),
    });
    configurer.addCmakeVariable('CMAKE_C_STANDARD', '99');
    configurer.addCmakeVariable('CMAKE_CXX_STANDARD', '14');
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
    for (const importDesc of configurer.imports) {
        const { name, url, ref } = importDesc;
        const { valid, dir } = await fetchImport(project, { name, url, ref });
        if (valid) {
            const { modules, importErrors } = await importModulesFromDir(dir, importDesc);
            for (const module of modules) {
                const childConfigurer = new ConfigurerImpl(project.dir(), dir, module);
                childConfigurer.importErrors = importErrors;
                res.push(childConfigurer);
                if (module.configure) {
                    module.configure(configurer);
                }
                configureRecurseImports(childConfigurer, project, res);
            }
        }
    }
}

async function doBuildSetup(project: ProjectImpl, config: Config): Promise<void> {
    const builders: BuilderImpl[] = [];
    for (const imp of projectImpl.imports()) {
        if (imp.importModule.build) {
            const builder = new BuilderImpl(project, imp.importDir, imp.importModule);
            imp.importModule.build(builder);
            builders.push(builder);
        }
    }
    if (projectImpl._rootModule.build) {
        const builder = new BuilderImpl(project, projectImpl._rootDir, projectImpl._rootModule);
        projectImpl._rootModule.build(builder);
        builders.push(builder);
    }
    resolveBuildItems(builders, project, config);
}

function resolveConfigureItems(configurers: ConfigurerImpl[], project: ProjectImpl): void {
    // resolve in reverse order, this allows the builtin config to be
    // overriden by imports, and imports to be overriden by the root project
    const reversed = configurers.toReversed();
    project._cmakeVariables = resolveCmakeVariables(reversed);
    project._settings = resolveSettings(reversed);
    project._imports = resolveImports(reversed);
    project._commands = resolveCommands(reversed);
    project._jobs = resolveJobs(reversed);
    project._tools = resolveTools(reversed);
    project._runners = resolveRunners(reversed);
    project._openers = resolveOpeners(reversed);
    project._adapters = resolveAdapters(reversed);
    project._configs = resolveConfigs(reversed, project);
}

function resolveBuildItems(builders: BuilderImpl[], project: ProjectImpl, config: Config): void {
    project._includeDirectories = resolveBuilderIncludeDirectories(builders, project);
    project._compileDefinitions = resolveBuilderCompileDefinitions(builders);
    project._compileOptions = resolveBuilderCompileOptions(builders);
    project._linkOptions = resolveBuilderLinkOptions(builders);
    project._targets = resolveTargets(builders, project, config);
}

function resolveCmakeVariables(configurers: ConfigurerImpl[]): CmakeVariable[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.cmakeVariables.map((v) => ({
            name: v.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            value: v.value,
        }))
    ));
}

function resolveSettings(configurers: ConfigurerImpl[]): Setting[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.settings.map((s) => ({
            name: s.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            default: s.default,
            value: s.default, // not a bug
            validate: s.validate,
        }))
    ));
}

function resolveImports(configurers: ConfigurerImpl[]): Import[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.imports.map((i) => ({
            name: i.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            importErrors: configurer.importErrors,
            url: i.url,
            ref: i.ref,
        }))
    ));
}

function resolveCommands(configurers: ConfigurerImpl[]): Command[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.commands.map((c) => ({
            name: c.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            help: c.help,
            run: c.run,
        }))
    ));
}

function resolveJobs(configurers: ConfigurerImpl[]): JobBuilder[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.jobs.map((j) => ({
            name: j.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            help: j.help,
            validate: j.validate,
            build: j.build,
        }))
    ));
}

function resolveTools(configurers: ConfigurerImpl[]): Tool[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.tools.map((t) => ({
            name: t.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            platforms: t.platforms,
            optional: t.optional,
            notFoundMsg: t.notFoundMsg,
            exists: t.exists,
        }))
    ));
}

function resolveRunners(configurers: ConfigurerImpl[]): Runner[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.runners.map((r) => ({
            name: r.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            run: r.run,
        }))
    ));
}

function resolveOpeners(configurers: ConfigurerImpl[]): Opener[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.openers.map((o) => ({
            name: o.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            generate: o.generate,
            open: o.open,
        }))
    ));
}

function resolveAdapters(configurers: ConfigurerImpl[]): Adapter[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.adapters.map((a) => ({
            name: a.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            generate: a.generate,
            configure: a.configure,
            build: a.build,
        }))
    ));
}

function resolveConfigs(configurers: ConfigurerImpl[], project: ProjectImpl): Config[] {
    return util.deduplicate(configurers.flatMap((configurer) =>
        configurer.configs.map((c) => ({
            name: c.name,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            platform: c.platform,
            buildMode: c.buildMode,
            runner: project.findRunner(c.runner) ?? project.runner('native'),
            opener: project.findOpener(c.opener),
            generator: c.generator,
            arch: c.arch,
            toolchainFile: c.toolchainFile
                ? util.resolveConfigScopePath(c.toolchainFile, {
                    rootDir: project.dir(),
                    config: { name: c.name, platform: c.platform, importDir: configurer.importDir },
                })
                : undefined,
            cmakeIncludes: c.cmakeIncludes
                ? c.cmakeIncludes.map((path) => {
                    return util.resolveConfigScopePath(path, {
                        rootDir: project.dir(),
                        config: { name: c.name, platform: c.platform, importDir: configurer.importDir },
                    });
                })
                : [],
            cmakeVariables: c.cmakeVariables ?? {},
            environment: c.environment ?? {},
            options: c.options ?? {},
            includeDirectories: resolveConfigIncludeDirectories(configurer, c),
            compileDefinitions: resolveConfigCompileDefinitions(configurer, c),
            compileOptions: resolveConfigCompileOptions(configurer, c),
            linkOptions: resolveConfigLinkOptions(configurer, c),
            compilers: c.compilers ?? [],
            validate: c.validate ?? (() => ({ valid: true, hints: [] })),
        }))
    ));
}

function resolveConfigIncludeDirectories(configurer: ConfigurerImpl, c: ConfigDesc): IncludeDirectory[] {
    if (c.includeDirectories === undefined) {
        return [];
    }
    return c.includeDirectories.flatMap((items) =>
        items.dirs.map((dir) => ({
            dir: util.resolveConfigScopePath(dir, {
                rootDir: configurer.rootDir,
                defaultAlias: '@self',
                config: { name: c.name, platform: c.platform, importDir: configurer.importDir },
            }),
            importDir: configurer.importDir,
            importModule: configurer.importModule,
            scope: items.scope,
            system: items.system ?? false,
            language: items.language,
            buildMode: items.buildMode,
        }))
    );
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
                importModule: builder._importModule,
                scope: items.scope,
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
                defaultAlias: '@targetsources',
                config: { name: config.name, platform: config.platform },
                target: { name: t.name, dir: t.dir, type: t.type, importDir: builder._importDir },
            }),
            importDir: builder._importDir,
            importModule: builder._importModule,
            scope: items.scope ?? 'public',
            system: items.system ?? false,
            language: items.language,
            buildMode: items.buildMode,
        }))
    );
}

function resolveConfigCompileDefinitions(configurer: ConfigurerImpl, c: ConfigDesc): CompileDefinition[] {
    if (c.compileDefinitions === undefined) {
        return [];
    }
    return c.compileDefinitions.flatMap((items) =>
        Object.entries(items.defs).map(([key, val]) => ({
            key,
            val,
            scope: items.scope,
            language: items.language,
            buildMode: items.buildMode,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
        }))
    );
}

function resolveBuilderCompileDefinitions(builders: BuilderImpl[]): CompileDefinition[] {
    return builders.flatMap((builder) =>
        builder._compileDefinitions.flatMap((items) =>
            Object.entries(items.defs).map(([key, val]) => ({
                key,
                val,
                scope: items.scope,
                language: items.language,
                buildMode: items.buildMode,
                importDir: builder._importDir,
                importModule: builder._importModule,
            }))
        )
    );
}

function resolveTargetCompileDefinitions(builder: BuilderImpl, t: TargetDesc): CompileDefinition[] {
    if (t.compileDefinitions === undefined) {
        return [];
    }
    return t.compileDefinitions.flatMap((items) =>
        Object.entries(items.defs).map(([key, val]) => ({
            key,
            val,
            scope: items.scope,
            language: items.language,
            buildMode: items.buildMode,
            importDir: builder._importDir,
            importModule: builder._importModule,
        }))
    );
}

function resolveConfigCompileOptions(configurer: ConfigurerImpl, c: ConfigDesc): CompileOption[] {
    if (c.compileOptions === undefined) {
        return [];
    }
    return c.compileOptions.flatMap((items) =>
        items.opts.map((opt) => ({
            opt,
            scope: items.scope,
            language: items.language,
            buildMode: items.buildMode,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
        }))
    );
}

function resolveBuilderCompileOptions(builders: BuilderImpl[]): CompileOption[] {
    return builders.flatMap((builder) =>
        builder._compileOptions.flatMap((items) =>
            items.opts.map((opt) => ({
                opt,
                scope: items.scope,
                language: items.language,
                buildMode: items.buildMode,
                importDir: builder._importDir,
                importModule: builder._importModule,
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
            scope: items.scope,
            language: items.language,
            buildMode: items.buildMode,
            importDir: builder._importDir,
            importModule: builder._importModule,
        }))
    );
}

function resolveConfigLinkOptions(configurer: ConfigurerImpl, c: ConfigDesc): LinkOption[] {
    if (c.linkOptions === undefined) {
        return [];
    }
    return c.linkOptions.flatMap((items) =>
        items.opts.map((opt) => ({
            opt,
            scope: items.scope,
            importDir: configurer.importDir,
            importModule: configurer.importModule,
        }))
    );
}

function resolveBuilderLinkOptions(builders: BuilderImpl[]): LinkOption[] {
    return builders.flatMap((builder) =>
        builder._linkOptions.flatMap((items) =>
            items.opts.map((opt) => ({
                opt,
                scope: items.scope,
                importDir: builder._importDir,
                importModule: builder._importModule,
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
            scope: items.scope,
            importDir: builder._importDir,
            importModule: builder._importModule,
        }))
    );
}

function resolveTargetSources(builder: BuilderImpl, project: ProjectImpl, config: Config, t: TargetDesc): string[] {
    return t.sources.map((src) =>
        util.resolveTargetScopePath(`@targetsources:${src}`, {
            rootDir: project._rootDir,
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
            importModule: builder._importModule,
            type: t.type,
            dir: t.dir,
            sources: resolveTargetSources(builder, project, config, t),
            deps: t.deps ?? [],
            libs: t.libs ?? [],
            includeDirectories: resolveTargetIncludeDirectories(builder, project, config, t),
            compileDefinitions: resolveTargetCompileDefinitions(builder, t),
            compileOptions: resolveTargetCompileOptions(builder, t),
            linkOptions: resolveTargetLinkOptions(builder, t),
            jobs: t.jobs ?? [],
        }))
    ));
}
