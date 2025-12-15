import { FibsModule, ImportedItem, NamedItem } from '../types.ts';
import { ProjectImpl } from '../impl/project.ts';
import { ConfigurerImpl } from '../impl/configurer.ts';
import { builtinAdapters } from '../adapters/index.ts';
import { builtinConfigs } from '../configs/index.ts';
import { builtinOpeners } from '../openers/index.ts';
import { builtinRunners } from '../runners/index.ts';
import { builtinTools } from '../tools/index.ts';
import { builtinCommands } from '../commands/index.ts';
import { fetchImport, importModulesFromDir } from './imports.ts';
import { host, settings, util } from './index.ts';

type Node = {
    configurer: ConfigurerImpl;
    module: FibsModule;
    importDir: string;
    importErrors: unknown[];
    children: Node[];
};

type Resolved<T> = T & ImportedItem & { importErrors: unknown[] };

export async function configure(module: FibsModule, project: ProjectImpl): Promise<void> {
    const root: Node = {
        configurer: new ConfigurerImpl(),
        module,
        importDir: project.dir(),
        importErrors: [],
        children: [],
    };

    // add builtin and default config items
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

    // run the module's optional configure function
    if (root.module.configure) {
        root.module.configure(root.configurer);
    }

    // recurse imports
    await recurseImports(root, project);

    // resolve the configuration into project
    resolveAll(root, project);

    // load persistent settings
    settings.load(project);

    // FIXME: do a cmake dummy run to obtain runtime config values
}

// FIXME: detect import cycles!
async function recurseImports(node: Node, project: ProjectImpl): Promise<void> {
    for (const importDesc of node.configurer.imports) {
        const { name, url, ref } = importDesc;
        const { valid, dir } = await fetchImport(project, { name, url, ref });
        if (valid) {
            const { modules, importErrors } = await importModulesFromDir(dir, importDesc);
            for (const module of modules) {
                const child: Node = {
                    configurer: new ConfigurerImpl(),
                    module,
                    importDir: dir,
                    importErrors,
                    children: [],
                };
                node.children.push(child);
                if (child.module.configure) {
                    child.module.configure(child.configurer);
                }
                recurseImports(child, project);
            }
        }
    }
}

function flatten<T extends NamedItem>(
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

function resolveAll(root: Node, project: ProjectImpl): void {
    project._name = root.configurer.name;
    resolveCmakeVariables(root, project);
    resolveSettings(root, project);
    resolveImports(root, project);
    resolveCommands(root, project);
    resolveJobs(root, project);
    resolveTools(root, project);
    resolveRunners(root, project);
    resolveOpeners(root, project);
    resolveConfigs(root, project);
    resolveAdapters(root, project);
}

function resolveCmakeVariables(root: Node, project: ProjectImpl): void {
    project.cmakeVariables = flattenUnique(root, (n) => n.configurer.cmakeVariables).map((v) => ({
        name: v.name,
        importDir: v.importDir,
        importModule: v.importModule,
        value: v.value,
    }));
}

function resolveSettings(root: Node, project: ProjectImpl): void {
    project.settings = flattenUnique(root, (n) => n.configurer.settings).map((s) => ({
        name: s.name,
        importDir: s.importDir,
        importModule: s.importModule,
        default: s.default,
        value: s.default, // not a bug
        validate: s.validate,
    }));
}

function resolveImports(root: Node, project: ProjectImpl): void {
    project.imports = flattenUnique(root, (n) => n.configurer.imports).map((i) => ({
        name: i.name,
        importDir: i.importDir,
        importModule: i.importModule,
        importErrors: i.importErrors,
        url: i.url,
        ref: i.ref,
    }));
}

function resolveCommands(root: Node, project: ProjectImpl): void {
    project.commands = flattenUnique(root, (n) => n.configurer.commands).map((c) => ({
        name: c.name,
        importDir: c.importDir,
        importModule: c.importModule,
        help: c.help,
        run: c.run,
    }));
}

function resolveJobs(root: Node, project: ProjectImpl): void {
    project.jobs = flattenUnique(root, (n) => n.configurer.jobs).map((j) => ({
        name: j.name,
        importDir: j.importDir,
        importModule: j.importModule,
        help: j.help,
        validate: j.validate,
        build: j.build,
    }));
}

function resolveTools(root: Node, project: ProjectImpl): void {
    project.tools = flattenUnique(root, (n) => n.configurer.tools).map((t) => ({
        name: t.name,
        importDir: t.importDir,
        importModule: t.importModule,
        platforms: t.platforms,
        optional: t.optional,
        notFoundMsg: t.notFoundMsg,
        exists: t.exists,
    }));
}

function resolveRunners(root: Node, project: ProjectImpl): void {
    project.runners = flattenUnique(root, (n) => n.configurer.runners).map((r) => ({
        name: r.name,
        importDir: r.importDir,
        importModule: r.importModule,
        run: r.run,
    }));
}

function resolveOpeners(root: Node, project: ProjectImpl): void {
    project.openers = flattenUnique(root, (n) => n.configurer.openers).map((o) => ({
        name: o.name,
        importDir: o.importDir,
        importModule: o.importModule,
        configure: o.configure,
        open: o.open,
    }));
}

function resolveAdapters(root: Node, project: ProjectImpl): void {
    project.adapters = flattenUnique(root, (n) => n.configurer.adapters).map((a) => ({
        name: a.name,
        importDir: a.importDir,
        importModule: a.importModule,
        configure: a.configure,
        build: a.build,
    }));
}

function resolveConfigs(root: Node, project: ProjectImpl): void {
    project.configs = flattenUnique(root, (n) => n.configurer.configs).map((c) => ({
        name: c.name,
        importDir: c.importDir,
        importModule: c.importModule,
        platform: c.platform,
        buildMode: c.buildMode,
        runner: c.runner ?? 'native',
        opener: c.opener,
        generator: c.generator,
        arch: c.arch,
        toolchainFile: c.toolchainFile,
        cmakeIncludes: c.cmakeIncludes ?? [],
        cmakeVariables: c.cmakeVariables ?? {},
        environment: c.environment ?? {},
        options: c.options ?? {},
        includeDirectories: c.includeDirectories ?? [],
        compileDefinitions: c.compileDefinitions ?? {},
        compileOptions: c.compileOptions ?? [],
        linkOptions: c.linkOptions ?? [],
        compilers: c.compilers ?? [],
        validate: c.validate ?? (() => ({ valid: true, hints: [] })),
    }));
}
