import { FibsModule, ImportedItem, NamedItem } from '../types.ts';
import { ProjectImpl } from '../impl/project.ts';
import { ConfigurerImpl } from '../impl/configurer.ts';
import { builtinAdapters } from '../adapters/index.ts';
import { builtinConfigs } from '../configs/index.ts';
import { builtinOpeners } from '../openers/index.ts';
import { builtinRunners } from '../runners/index.ts';
import { builtinTools } from '../tools/index.ts';
import { fetchImport, importModulesFromDir } from './imports.ts';

type Node = {
    configurer: ConfigurerImpl;
    module: FibsModule;
    importDir: string;
    children: Node[];
};

export async function configure(module: FibsModule, project: ProjectImpl): Promise<void> {
    const root: Node = {
        configurer: new ConfigurerImpl(),
        module,
        importDir: project.dir(),
        children: [],
    };

    // add builtin config items
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
}

// FIXME: detect import cycles!
async function recurseImports(node: Node, project: ProjectImpl): Promise<void> {
    for (const importDesc of node.configurer.imports) {
        const { name, url, ref } = importDesc;
        const { valid, dir } = await fetchImport(project, { name, url, ref });
        if (valid) {
            const { modules } = await importModulesFromDir(dir, importDesc);
            for (const module of modules) {
                const child: Node = {
                    configurer: new ConfigurerImpl(),
                    module,
                    importDir: dir,
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

function flatten<T extends NamedItem>(node: Node, extract: (node: Node) => T[]): (T & ImportedItem)[] {
    // flatten  depth-first
    const res: (T & ImportedItem)[] = [];
    const extractRes = extract(node);
    res.push(...extractRes.map((item) => ({ ...item, importDir: node.importDir, importModule: node.module })));
    for (const child of node.children) {
        res.push(...flatten(child, extract));
    }
    return res;
}

function deduplicate<T extends NamedItem>(items: T[]): T[] {
    // later item wins
    const map = new Map<string, T>();
    for (const item of items) {
        map.set(item.name, item);
    }
    return Array.from(map.values());
}

function flattenUnique<T extends NamedItem>(node: Node, extract: (node: Node) => T[]): (T & ImportedItem)[] {
    return deduplicate(flatten(node, extract));
}

function resolveAll(root: Node, project: ProjectImpl): void {
    project._name = root.configurer.name;
    //resolveCmakeVariables(root, project);
    resolveImports(root, project);
    resolveCommands(root, project);
    resolveJobs(root, project);
    resolveTools(root, project)
    resolveRunners(root, project);
    resolveOpeners(root, project);
    resolveConfigs(root, project);
    resolveAdapters(root, project);
    //resolveSettings(root, project);
}

function resolveImports(root: Node, project: ProjectImpl): void {
    project.imports = flattenUnique(root, (n) => n.configurer.imports).map((i) => ({
        name: i.name,
        importDir: i.importDir,
        importModule: i.importModule,
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
