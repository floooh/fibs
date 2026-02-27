export enum ProjectPhase {
    Initial = 0,
    Configure = 1,
    Build = 2,
    Generate = 3,
}

type IConfigPhaseInfo = {
    hostPlatform(): Platform;
    hostArch(): Arch;
    fibsDir(): string;
    sdkDir(): string;
    importsDir(): string;
    isHostPlatform(platform: Platform): boolean;
    isHostWindows(): boolean;
    isHostLinux(): boolean;
    isHostMacOS(): boolean;
};

type IBuildPhaseInfo = IConfigPhaseInfo & {
    activeConfig(): Config;
    platform(): Platform;
    compiler(): Compiler;

    importDir(importName: string): string;
    importOptions<T>(name: string, schema: Schema): T;
    configDir(configName?: string): string;
    buildDir(configName?: string): string;
    distDir(configName?: string): string;

    settings(): Setting[];
    configs(): Config[];
    commands(): Command[];
    imports(): Import[];
    tools(): Tool[];
    jobs(): JobBuilder[];
    runners(): Runner[];
    openers(): Opener[];

    findSetting(name: string): Setting | undefined;
    findConfig(name: string): Config | undefined;
    findCommand(name: string): Command | undefined;
    findImport(name: string): Import | undefined;
    findTool(name: string): Tool | undefined;
    findRunner(name: string): Runner | undefined;
    findOpener(name: string): Opener | undefined;
    // deno-lint-ignore no-explicit-any
    findImportModule(importName: string, filename?: string): any | undefined;

    setting(name: string): Setting;
    config(name: string): Config;
    command(name: string): Command;
    import(name: string): Import;
    tool(name: string): Tool;
    runner(name: string): Runner;
    opener(name: string): Opener;
    // deno-lint-ignore no-explicit-any
    importModule(importName: string, filename?: string): any;

    isPlatform(platform: Platform): boolean;
    isWindows(): boolean;
    isLinux(): boolean;
    isMacOS(): boolean;
    isIOS(): boolean;
    isAndroid(): boolean;
    isEmscripten(): boolean;
    isWasi(): boolean;
    isWasm(): boolean;
    isCompiler(compiler: Compiler): boolean;
    isClang(): boolean; // includes AppleClang
    isAppleClang(): boolean;
    isMsvc(): boolean;
    isGcc(): boolean;
};

type IGeneratePhaseInfo = IBuildPhaseInfo & {
    name(): string;
    targetSourceDir(targetName: string): string;
    targetBuildDir(targetName: string, configName?: string): string;
    targetDistDir(targetName: string, configName?: string): string;
    targetAssetsDir(targetName: string, configName?: string): string;
    cmakeVariables(): CmakeVariable[];
    cmakeIncludes(): CmakeInclude[];
    targets(): Target[];
    includeDirectories(): IncludeDirectory[];
    linkDirectories(): LinkDirectory[];
    compileDefinitions(): CompileDefinition[];
    compileOptions(): CompileOption[];
    linkOptions(): LinkOption[];

    findTarget(name: string | undefined): Target | undefined;
    target(name: string): Target;

    findCompileDefinition(name: string): CompileDefinition | undefined;
};

export type Configurer = IConfigPhaseInfo & {
    projectDir(): string;
    selfDir(): string;
    configDir(configName: string): string;
    buildDir(configName: string): string;
    distDir(configName: string): string;

    addImportOptions(opts: Record<string, unknown>): void;
    addImportOptions(optsFunc: (p: Project) => Record<string, unknown>): void;
    addImport(imp: ImportDesc): void;
    addCommand(cmd: CommandDesc): void;
    addJob(job: JobBuilderDesc): void;
    addTool(tool: ToolDesc): void;
    addRunner(runner: RunnerDesc): void;
    addOpener(opener: OpenerDesc): void;
    addSetting(setting: SettingDesc): void;
    addConfig(config: ConfigDesc): void;
};

export type Builder = IBuildPhaseInfo & {
    projectDir(): string;
    selfDir(): string;

    setProjectName(name: string): void;
    addCmakeVariable(name: string, value: string | boolean): void;
    addCmakeInclude(path: string): void;
    addTarget(target: TargetDesc): void;
    addTarget(name: string, type: TargetType, fn: (t: TargetBuilder) => void): void;
    addIncludeDirectories(dirs: IncludeDirectoriesDesc): void;
    addIncludeDirectories(dirs: string[]): void;
    addLinkDirectories(dirs: LinkDirectoriesDesc): void;
    addLinkDirectories(dirs: string[]): void;
    addCompileDefinitions(defs: CompileDefinitionsDesc): void;
    addCompileDefinitions(defs: Record<string, string>): void;
    addCompileOptions(opts: CompileOptionsDesc): void;
    addCompileOptions(opts: string[]): void;
    addLinkOptions(opts: LinkOptionsDesc): void;
    addLinkOptions(opts: string[]): void;
};

export type TargetBuilder = {
    name(): string;
    type(): TargetType;
    buildDir(configName?: string): string;
    distDir(configName?: string): string;
    assetsDir(configName?: string): string;

    setDir(dir: string): void;
    setIdeFolder(folder: string): void;
    addSource(source: string): void;
    addSources(sources: string[]): void;
    addDependencies(dep: string[]): void;
    addLibraries(lib: string[]): void;
    addFrameworks(lib: string[]): void;
    addProperties(props: Record<string, string>): void;
    addIncludeDirectories(dirs: IncludeDirectoriesDesc): void;
    addIncludeDirectories(dirs: string[]): void;
    addLinkDirectories(dirs: LinkDirectoriesDesc): void;
    addLinkDirectories(dirs: string[]): void;
    addCompileDefinitions(defs: CompileDefinitionsDesc): void;
    addCompileDefinitions(defs: Record<string, string>): void;
    addCompileOptions(opts: CompileOptionsDesc): void;
    addCompileOptions(opts: string[]): void;
    addLinkOptions(opts: LinkOptionsDesc): void;
    addLinkOptions(opts: string[]): void;
    addJob(job: TargetJob): void;
};

export type Project = IGeneratePhaseInfo & {
    dir(): string;
    phase(): ProjectPhase;
};

// deno-lint-ignore no-explicit-any
export type FibsModule = { [key: string]: (...args: any[]) => any };

export function assertFibsModule(val: unknown): asserts val is FibsModule {
    const obj = val as Record<string, unknown>;
    if (obj.configure !== undefined && typeof obj.configure !== 'function') {
        throw new Error('exported configure property must be a function!');
    }
    if (obj.build !== undefined && typeof obj.build !== 'function') {
        throw new Error('exported build property must be a function!');
    }
    if ((obj.configure === undefined) && (obj.build === undefined)) {
        throw new Error(`fibs modules must have at least a configure() or build() function`);
    }
}

export type Arch = 'x86_64' | 'arm64' | 'wasm32' | 'unknown-arch';

export type Platform = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'emscripten' | 'wasi' | 'unknown-platform';

export type Compiler = 'msvc' | 'gcc' | 'clang' | 'appleclang' | 'unknown-compiler';

export type Generator = 'vstudio' | 'xcode' | 'ninja' | 'ninja-multi-config' | 'make';

export type Language = 'c' | 'cxx';

export type TargetType = 'plain-exe' | 'windowed-exe' | 'lib' | 'dll' | 'interface';

export type BuildMode = 'release' | 'debug';

export type Scope = 'interface' | 'public' | 'private';

export type NamedItem = {
    name: string;
};

export type ImportedItem = {
    importDir: string;
};

export type CmakeVariableDesc = NamedItem & {
    value: string | boolean;
};
export type CmakeVariable = ImportedItem & CmakeVariableDesc;

export type CmakeInclude = ImportedItem & { path: string };

export type LinkDirectoriesDesc = {
    dirs: string[];
    scope?: Scope;
    language?: Language;
    buildMode?: BuildMode;
};
export function isLinkDirectoriesDesc(val: unknown): val is LinkDirectoriesDesc {
    return val !== null &&
        typeof val === 'object' &&
        'dirs' in val &&
        Array.isArray(val.dirs);
}
export type LinkDirectory = ImportedItem & {
    dir: string;
    scope: Scope;
    language?: Language;
    buildMode?: BuildMode;
};

export type IncludeDirectoriesDesc = {
    dirs: string[];
    scope?: Scope;
    system?: boolean;
    language?: Language;
    buildMode?: BuildMode;
};
export function isIncludeDirectoriesDesc(val: unknown): val is IncludeDirectoriesDesc {
    return val !== null &&
        typeof val === 'object' &&
        'dirs' in val &&
        Array.isArray(val.dirs);
}
export type IncludeDirectory = ImportedItem & {
    dir: string;
    scope: Scope;
    system: boolean;
    language?: Language;
    buildMode?: BuildMode;
};

export type CompileDefinitionsDesc = {
    defs: Record<string, string>;
    scope?: Scope;
    language?: Language;
    buildMode?: BuildMode;
};
export function isCompileDefinitionsDesc(val: unknown): val is CompileDefinitionsDesc {
    return val !== null &&
        typeof val === 'object' &&
        'defs' in val &&
        typeof val.defs === 'object' &&
        val.defs !== null;
}
export type CompileDefinition = NamedItem & ImportedItem & {
    val: string;
    scope: Scope;
    language?: Language;
    buildMode?: BuildMode;
};

export type CompileOptionsDesc = {
    opts: string[];
    scope?: Scope;
    language?: Language;
    buildMode?: BuildMode;
};
export function isCompileOptionsDesc(val: unknown): val is CompileOptionsDesc {
    return val !== null &&
        typeof val === 'object' &&
        'opts' in val &&
        Array.isArray(val.opts);
}
export type CompileOption = ImportedItem & {
    opt: string;
    scope: Scope;
    language?: Language;
    buildMode?: BuildMode;
};

export type LinkOptionsDesc = {
    opts: string[];
    scope?: Scope;
    language?: Language;
    buildMode?: BuildMode;
};
export function isLinkOptionsDesc(val: unknown): val is LinkOptionsDesc {
    return val !== null &&
        typeof val === 'object' &&
        'opts' in val &&
        Array.isArray(val.opts);
}
export type LinkOption = ImportedItem & {
    opt: string;
    scope: Scope;
    language?: Language;
    buildMode?: BuildMode;
};

export type SettingDesc = NamedItem & {
    default: string;
    validate(project: Project, value: string): { valid: boolean; hint: string };
};
export type Setting = NamedItem & SettingDesc & {
    value: string;
};

export type ConfigDesc = NamedItem & {
    platform: Platform;
    buildMode: BuildMode;
    runner?: string;
    opener?: string;
    generator?: Generator;
    generatorArchitecture?: string;
    generatorToolset?: string;
    toolchainFile?: string;
    environment?: Record<string, string>;
    cmakeVariables?: Record<string, string | boolean>;
    cmakeCacheVariables?: Record<string, string | boolean>;
    validate?(project: Project): { valid: boolean; hints: string[] };
};

export type Config = NamedItem & ImportedItem & {
    platform: Platform;
    buildMode: BuildMode;
    runner: Runner;
    opener?: Opener;
    generator?: Generator;
    generatorArchitecture?: string;
    generatorToolset?: string;
    toolchainFile?: string;
    environment: Record<string, string>;
    cmakeVariables: CmakeVariable[];
    cmakeCacheVariables: CmakeVariable[];
    validate(project: Project): { valid: boolean; hints: string[] };
};

export type ImportDesc = NamedItem & {
    url: string;
    ref?: string;
    files?: string[];
};

export type ImportedModule = NamedItem & { module: FibsModule };

export type Import = NamedItem & ImportedItem & {
    url: string;
    ref: string | undefined;
    importErrors: unknown[];
    modules: ImportedModule[];
};

export type TargetJob = {
    job: string;
    args: Record<string, unknown>;
};

export type TargetDesc = NamedItem & {
    type: TargetType;
    dir?: string;
    ideFolder?: string;
    sources: string[];
    deps?: string[];
    libs?: string[];
    props?: Record<string, string>;
    frameworks?: string[];
    includeDirectories?: IncludeDirectoriesDesc[];
    linkDirectories?: LinkDirectoriesDesc[];
    compileDefinitions?: CompileDefinitionsDesc[];
    compileOptions?: CompileOptionsDesc[];
    linkOptions?: LinkOptionsDesc[];
    jobs?: TargetJob[];
};

export type Target = NamedItem & ImportedItem & {
    type: TargetType;
    dir: string;
    ideFolder?: string;
    sources: string[];
    deps: string[];
    libs: string[];
    props: Record<string, string>;
    frameworks: string[];
    includeDirectories: IncludeDirectory[];
    linkDirectories: LinkDirectory[];
    compileDefinitions: CompileDefinition[];
    compileOptions: CompileOption[];
    linkOptions: LinkOption[];
    jobs: TargetJob[];
};

export type JobBuilderDesc = NamedItem & {
    help(): void;
    validate(args: unknown): { valid: boolean; hints: string[] };
    build(project: Project, config: Config, target: Target, args: unknown): Job;
};

export type JobBuilder = ImportedItem & JobBuilderDesc;

export type Job = NamedItem & {
    inputs: string[];
    outputs: string[];
    addOutputsToTargetSources: boolean;
    args: unknown;
    // deno-lint-ignore no-explicit-any
    func: (inputs: string[], output: string[], args: any) => Promise<void>;
};

export type CommandDesc = NamedItem & {
    help(): void;
    run(project: Project, args: string[]): Promise<void>;
};
export type Command = ImportedItem & CommandDesc;

/**
 * Config options for util.runCmd()
 */
export type RunOptions = {
    /** command line arguments */
    args: string[];
    /** optional working directory */
    cwd?: string;
    /** stdout behaviour */
    stdout?: 'inherit' | 'piped' | 'null';
    /** stderr behaviour */
    stderr?: 'inherit' | 'piped' | 'null';
    /** stdin behaviour */
    stdin?: 'inherit' | 'piped' | 'null';
    /** log command line */
    showCmd?: boolean;
    /** whether to run the command via 'cmd /c' on Windows */
    winUseCmd?: boolean;
};

/**
 * Result of util.runCmd()
 */
export type RunResult = {
    /** the exit code of the command (zero on success) */
    exitCode: number;
    /** captured stdout (with stdout: 'piped') */
    stdout: string;
    /** captured stderr (with stderr: 'piped') */
    stderr: string;
};

export type RunnerDesc = NamedItem & {
    run(project: Project, config: Config, target: Target, options: RunOptions): Promise<void>;
};
export type Runner = ImportedItem & RunnerDesc;

export type OpenerDesc = NamedItem & {
    generate(project: Project, config: Config): Promise<void>;
    open(project: Project, config: Config): Promise<void>;
};
export type Opener = ImportedItem & OpenerDesc;

export type ToolDesc = NamedItem & {
    platforms: Platform[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
};
export type Tool = ImportedItem & ToolDesc;

export type SchemaItem = {
    type: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]' | 'boolean[]';
    optional: boolean;
    desc: string;
} | {
    type: 'object';
    schema: Schema;
    optional: boolean;
    desc: string;
} | {
    type: 'enum';
    items: string[];
    optional: boolean;
    desc: string;
};
export type Schema = Record<string, SchemaItem>;
