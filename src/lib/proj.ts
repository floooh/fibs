import { host, log, settings, util } from './index.ts';
import {
    Adapter,
    Command,
    CompileDefinition,
    CompileOption,
    Config,
    ConfigDesc,
    FibsModule,
    Import,
    ImportedItem,
    IncludeDirectory,
    JobBuilder,
    LinkOption,
    NamedItem,
    Opener,
    Project,
    Runner,
    Setting,
    Target,
    TargetDesc,
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
    log.info(`proj.build called (buildTarget: ${buildTarget}, forceRebuild: ${forceRebuild})`);
}

export function validateTarget(
    target: Target,
    options: { silent?: boolean; abortOnError?: boolean },
): { valid: boolean; hints: string[] } {
    log.info(`FIXME: proj.validateTarget() called`);
    return { valid: true, hints: [] };
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

type Node = {
    configurer: ConfigurerImpl;
    module: FibsModule;
    importDir: string;
    importErrors: unknown[];
    children: Node[];
};

type Resolved<T> = T & ImportedItem & { importErrors: unknown[] };

function flatten<T extends NamedItem, N>(
    node: Node,
    extract: (node: Node) => T[],
): Resolved<T>[] {
    const res: (T & ImportedItem & { importErrors: unknown[] })[] = [];
    const extractRes = extract(node);
    res.push(
        ...extractRes.map((item) => ({
            ...item,
            importDir: node.importDir,
            importModule: node.module,
            importErrors: node.importErrors,
        })),
    );
    for (const child of node.children) {
        res.push(...flatten(child, extract));
    }
    return res;
}

function deduplicate<T extends NamedItem>(items: T[]): T[] {
    const res: T[] = [];
    for (const item of items) {
        util.addOrReplace(res, item);
    }
    return res;
}

function flattenUnique<T extends NamedItem>(node: Node, extract: (node: Node) => T[]): Resolved<T>[] {
    return deduplicate(flatten(node, extract));
}

async function doConfigure(module: FibsModule, project: ProjectImpl): Promise<void> {
    const root: Node = {
        configurer: new ConfigurerImpl(project.dir()),
        module,
        importDir: project.dir(),
        importErrors: [],
        children: [],
    };

    root.configurer.addSetting({
        name: 'config',
        default: host.defaultConfig(),
        validate: () => ({ valid: true, hint: '' }),
    });
    root.configurer.addCmakeVariable('CMAKE_C_STANDARD', '99');
    root.configurer.addCmakeVariable('CMAKE_CXX_STANDARD', '14');
    builtinCommands.forEach((command) => root.configurer.addCommand(command));
    builtinAdapters.forEach((adapter) => root.configurer.addAdapter(adapter));
    builtinConfigs.forEach((config) => root.configurer.addConfig(config));
    builtinOpeners.forEach((opener) => root.configurer.addOpener(opener));
    builtinRunners.forEach((runner) => root.configurer.addRunner(runner));
    builtinTools.forEach((tool) => root.configurer.addTool(tool));

    if (root.module.configure) {
        root.module.configure(root.configurer);
    }
    await configureRecurseImports(root, project);
    resolveConfigureItems(root, project);
    settings.load(project);
}

// FIXME: detect import cycles!
async function configureRecurseImports(node: Node, project: ProjectImpl): Promise<void> {
    for (const importDesc of node.configurer.imports) {
        const { name, url, ref } = importDesc;
        const { valid, dir } = await fetchImport(project, { name, url, ref });
        if (valid) {
            const { modules, importErrors } = await importModulesFromDir(dir, importDesc);
            for (const module of modules) {
                const child: Node = {
                    configurer: new ConfigurerImpl(project._rootDir),
                    module,
                    importDir: dir,
                    importErrors,
                    children: [],
                };
                node.children.push(child);
                if (child.module.configure) {
                    child.module.configure(child.configurer);
                }
                configureRecurseImports(child, project);
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

function resolveConfigureItems(root: Node, project: ProjectImpl): void {
    project._name = root.configurer.projectName;
    resolveCmakeVariables(root, project);
    project._settings = resolveSettings(root);
    project._imports = resolveImports(root);
    project._commands = resolveCommands(root);
    project._jobs = resolveJobs(root);
    project._tools = resolveTools(root);
    project._runners = resolveRunners(root);
    project._openers = resolveOpeners(root);
    project._adapters = resolveAdapters(root);
    project._configs = resolveConfigs(root, project);
}

function resolveBuildItems(builders: BuilderImpl[], project: ProjectImpl, config: Config): void {
    project._includeDirectories = resolveBuilderIncludeDirectories(builders, project);
    project._compileDefinitions = resolveBuilderCompileDefinitions(builders);
    project._compileOptions = resolveBuilderCompileOptions(builders);
    project._linkOptions = resolveBuilderLinkOptions(builders);
    project._targets = resolveTargets(builders, project, config);
}

function resolveCmakeVariables(root: Node, project: ProjectImpl): void {
    project._cmakeVariables = flattenUnique(root, (n) => n.configurer.cmakeVariables).map((v) => ({
        name: v.name,
        importDir: v.importDir,
        importModule: v.importModule,
        value: v.value,
    }));
}

function resolveSettings(root: Node): Setting[] {
    return flattenUnique(root, (n) => n.configurer.settings).map((s) => ({
        name: s.name,
        importDir: s.importDir,
        importModule: s.importModule,
        default: s.default,
        value: s.default, // not a bug
        validate: s.validate,
    }));
}

function resolveImports(root: Node): Import[] {
    return flattenUnique(root, (n) => n.configurer.imports).map((i) => ({
        name: i.name,
        importDir: i.importDir,
        importModule: i.importModule,
        importErrors: i.importErrors,
        url: i.url,
        ref: i.ref,
    }));
}

function resolveCommands(root: Node): Command[] {
    return flattenUnique(root, (n) => n.configurer.commands).map((c) => ({
        name: c.name,
        importDir: c.importDir,
        importModule: c.importModule,
        help: c.help,
        run: c.run,
    }));
}

function resolveJobs(root: Node): JobBuilder[] {
    return flattenUnique(root, (n) => n.configurer.jobs).map((j) => ({
        name: j.name,
        importDir: j.importDir,
        importModule: j.importModule,
        help: j.help,
        validate: j.validate,
        build: j.build,
    }));
}

function resolveTools(root: Node): Tool[] {
    return flattenUnique(root, (n) => n.configurer.tools).map((t) => ({
        name: t.name,
        importDir: t.importDir,
        importModule: t.importModule,
        platforms: t.platforms,
        optional: t.optional,
        notFoundMsg: t.notFoundMsg,
        exists: t.exists,
    }));
}

function resolveRunners(root: Node): Runner[] {
    return flattenUnique(root, (n) => n.configurer.runners).map((r) => ({
        name: r.name,
        importDir: r.importDir,
        importModule: r.importModule,
        run: r.run,
    }));
}

function resolveOpeners(root: Node): Opener[] {
    return flattenUnique(root, (n) => n.configurer.openers).map((o) => ({
        name: o.name,
        importDir: o.importDir,
        importModule: o.importModule,
        generate: o.generate,
        open: o.open,
    }));
}

function resolveAdapters(root: Node): Adapter[] {
    return flattenUnique(root, (n) => n.configurer.adapters).map((a) => ({
        name: a.name,
        importDir: a.importDir,
        importModule: a.importModule,
        generate: a.generate,
        configure: a.configure,
        build: a.build,
    }));
}

function resolveConfigs(root: Node, project: ProjectImpl): Config[] {
    return flattenUnique(root, (n) => n.configurer.configs).map((c) => ({
        name: c.name,
        importDir: c.importDir,
        importModule: c.importModule,
        platform: c.platform,
        buildMode: c.buildMode,
        runner: project.findRunner(c.runner) ?? project.runner('native'),
        opener: project.findOpener(c.opener),
        generator: c.generator,
        arch: c.arch,
        toolchainFile: c.toolchainFile
            ? util.resolveConfigScopePath(c.toolchainFile, {
                rootDir: project.dir(),
                config: { name: c.name, platform: c.platform, importDir: c.importDir },
            })
            : undefined,
        cmakeIncludes: c.cmakeIncludes
            ? c.cmakeIncludes.map((path) => {
                return util.resolveConfigScopePath(path, {
                    rootDir: project.dir(),
                    config: { name: c.name, platform: c.platform, importDir: c.importDir },
                });
            })
            : [],
        cmakeVariables: c.cmakeVariables ?? {},
        environment: c.environment ?? {},
        options: c.options ?? {},
        includeDirectories: resolveConfigIncludeDirectories(project.dir(), c),
        compileDefinitions: resolveConfigCompileDefinitions(c),
        compileOptions: resolveConfigCompileOptions(c),
        linkOptions: resolveConfigLinkOptions(c),
        compilers: c.compilers ?? [],
        validate: c.validate ?? (() => ({ valid: true, hints: [] })),
    }));
}

function resolveConfigIncludeDirectories(rootDir: string, c: Resolved<ConfigDesc>): IncludeDirectory[] {
    if (c.includeDirectories === undefined) {
        return [];
    }
    return c.includeDirectories.flatMap((items) =>
        items.dirs.map((dir) => ({
            dir: util.resolveConfigScopePath(dir, {
                rootDir,
                config: { name: c.name, platform: c.platform, importDir: c.importDir },
            }),
            importDir: c.importDir,
            importModule: c.importModule,
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
                dir: util.resolveModuleScopePath(dir, { rootDir: project._rootDir, moduleDir: builder._importDir }),
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
                config: { name: config.name, platform: config.platform },
                target: { name: t.name, dir: t.dir, type: t.type, importDir: builder._importDir },
            }),
            importDir: builder._importDir,
            importModule: builder._importModule,
            scope: items.scope,
            system: items.system ?? false,
            language: items.language,
            buildMode: items.buildMode,
        }))
    );
}

function resolveConfigCompileDefinitions(c: Resolved<ConfigDesc>): CompileDefinition[] {
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
            importDir: c.importDir,
            importModule: c.importModule,
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

function resolveConfigCompileOptions(c: Resolved<ConfigDesc>): CompileOption[] {
    if (c.compileOptions === undefined) {
        return [];
    }
    return c.compileOptions.flatMap((items) =>
        items.opts.map((opt) => ({
            opt,
            scope: items.scope,
            language: items.language,
            buildMode: items.buildMode,
            importDir: c.importDir,
            importModule: c.importModule,
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

function resolveConfigLinkOptions(c: Resolved<ConfigDesc>): LinkOption[] {
    if (c.linkOptions === undefined) {
        return [];
    }
    return c.linkOptions.flatMap((items) =>
        items.opts.map((opt) => ({
            opt,
            scope: items.scope,
            importDir: c.importDir,
            importModule: c.importModule,
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

function resolveTargets(builders: BuilderImpl[], project: ProjectImpl, config: Config): Target[] {
    return builders.flatMap((builder) =>
        builder._targets.map((t) => ({
            name: t.name,
            importDir: builder._importDir,
            importModule: builder._importModule,
            type: t.type,
            dir: t.dir,
            sources: t.sources ?? [],
            deps: t.deps ?? [],
            libs: t.libs ?? [],
            includeDirectories: resolveTargetIncludeDirectories(builder, project, config, t),
            compileDefinitions: resolveTargetCompileDefinitions(builder, t),
            compileOptions: resolveTargetCompileOptions(builder, t),
            linkOptions: resolveTargetLinkOptions(builder, t),
            jobs: t.jobs ?? [],
        }))
    );
}
