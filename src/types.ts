export type Configurer = {
    addCmakeVariable(name: string, value: string | boolean): void;
    addImport(imp: ImportDesc): void;
    addCommand(cmd: CommandDesc): void;
    addJob(job: JobBuilderDesc): void;
    addTool(tool: ToolDesc): void;
    addRunner(runner: RunnerDesc): void;
    addOpener(opener: OpenerDesc): void;
    addAdapter(adapter: AdapterDesc): void;
    addSetting(setting: SettingDesc): void;
    addConfig(config: ConfigDesc): void;

    hostPlatform(): Platform;
    hostArch(): Arch;
    projectDir(): string;
    fibsDir(): string;
    sdkDir(): string;
    importsDir(): string;
    configDir(configName: string): string;
    buildDir(configName: string): string;
    distDir(configName: string): string;
};

export type Project = {
    name(): string;
    activeConfig(): Config;
    platform(): Platform;
    compiler(): Compiler;
    hostPlatform(): Platform;
    hostArch(): Arch;

    dir(): string;
    fibsDir(): string;
    sdkDir(): string;
    configDir(configName?: string): string;
    buildDir(configName?: string): string;
    distDir(configName?: string): string;
    importsDir(): string;
    targetBuildDir(targetName: string, configName?: string): string;
    targetDistDir(targetName: string, configName?: string): string;
    targetAssetsDir(targetName: string, configName?: string): string;

    settings(): Setting[];
    cmakeVariables(): CmakeVariable[];
    configs(): Config[];
    targets(): Target[];
    adapters(): Adapter[];
    commands(): Command[];
    imports(): Import[];
    tools(): Tool[];
    jobs(): JobBuilder[];
    runners(): Runner[];
    openers(): Opener[];

    includeDirectories(): IncludeDirectory[];
    compileDefinitions(): CompileDefinition[];
    compileOptions(): CompileOption[];
    linkOptions(): LinkOption[];

    findSetting(name: string | undefined): Setting | undefined;
    setting(name: string): Setting;
    findConfig(name: string | undefined): Config | undefined;
    config(name: string): Config;
    findTarget(name: string | undefined): Target | undefined;
    target(name: string): Target;
    findAdapter(name: string | undefined): Adapter | undefined;
    adapter(name: string): Adapter;
    findCommand(name: string | undefined): Command | undefined;
    command(name: string): Command;
    findImport(name: string | undefined): Import | undefined;
    import(name: string): Import;
    findTool(name: string | undefined): Tool | undefined;
    tool(name: string): Tool;
    findRunner(name: string | undefined): Runner | undefined;
    runner(name: string): Runner;
    findOpener(name: string | undefined): Opener | undefined;
    opener(name: string): Opener;

    isPlatform(platform: Platform): boolean;
    isWindows(): boolean;
    isLinux(): boolean;
    isMacOS(): boolean;
    isIOS(): boolean;
    isAndroid(): boolean;
    isEmscripten(): boolean;
    isWasi(): boolean;
    isWasm(): boolean;
    isHostPlatform(platform: Platform): boolean;
    isHostWindows(): boolean;
    isHostLinux(): boolean;
    isHostMacOS(): boolean;
    isCompiler(compiler: Compiler): boolean;
    isClang(): boolean; // includes AppleClang
    isAppleClang(): boolean;
    isMsvc(): boolean;
    isGcc(): boolean;
};

export type Builder =
    & Omit<Project, 'targets' | 'includeDirectories' | 'compileDefinitions' | 'compileOptions' | 'linkOptions'>
    & {
        addIncludeDirectories(dirs: IncludeDirectoriesDesc): void;
        addCompileDefinitions(defs: CompileDefinitionsDesc): void;
        addCompileOptions(opts: CompileOptionsDesc): void;
        addLinkOptions(opts: LinkOptionsDesc): void;
        addTarget(target: TargetDesc): void;
        addTarget(name: string, type: TargetType, fn: (t: TargetBuilder) => void): void;
    };

export type TargetBuilder = {
    setSourcesDir(dir: string): void;
    addSource(source: string): void;
    addSources(sources: string[]): void;
    addDependency(dep: string): void;
    addLinkLibrary(lib: string): void;
    addIncludeDirectories(dirs: IncludeDirectoriesDesc): void;
    addCompileDefinitions(defs: CompileDefinitionsDesc): void;
    addCompileOptions(opts: CompileOptionsDesc): void;
    addLinkOptions(opts: LinkOptionsDesc): void;
    addJob(job: TargetJob): void;
};

export type FibsModule = {
    configure?(c: Configurer): void;
    build?(b: Builder): void;
};

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
    importModule: FibsModule;
};

export type CmakeVariableDesc = NamedItem & {
    value: string | boolean;
};
export type CmakeVariable = ImportedItem & CmakeVariableDesc;

export type IncludeDirectoriesDesc = {
    dirs: string[];
    scope?: Scope;
    system?: boolean;
    language?: Language;
    buildMode?: BuildMode;
};
export type IncludeDirectory = ImportedItem & {
    dir: string;
    scope?: Scope;
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
export type CompileDefinition = ImportedItem & {
    key: string;
    val: string;
    scope?: Scope;
    language?: Language;
    buildMode?: BuildMode;
};

export type CompileOptionsDesc = {
    opts: string[];
    scope?: Scope;
    language?: Language;
    buildMode?: BuildMode;
};
export type CompileOption = ImportedItem & {
    opt: string;
    scope?: Scope;
    language?: Language;
    buildMode?: BuildMode;
};

export type LinkOptionsDesc = {
    opts: string[];
    scope?: Scope;
    buildMode?: BuildMode;
};
export type LinkOption = ImportedItem & {
    opt: string;
    scope?: Scope;
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
    arch?: Arch;
    toolchainFile?: string;
    cmakeIncludes?: string[];
    cmakeVariables?: Record<string, string | boolean>;
    environment?: Record<string, string>;
    options?: Record<string, unknown>;
    includeDirectories?: IncludeDirectoriesDesc[];
    compileDefinitions?: CompileDefinitionsDesc[];
    compileOptions?: CompileOptionsDesc[];
    linkOptions?: LinkOptionsDesc[];
    compilers?: Compiler[];
    validate?(project: Project): { valid: boolean; hints: string[] };
};

export type Config = NamedItem & ImportedItem & {
    platform: Platform;
    buildMode: BuildMode;
    runner: Runner;
    opener?: Opener;
    generator?: Generator;
    arch?: Arch;
    toolchainFile?: string;
    cmakeIncludes: string[];
    cmakeVariables: CmakeVariable[];
    environment: Record<string, string>;
    options: Record<string, unknown>;
    includeDirectories: IncludeDirectory[];
    compileDefinitions: CompileDefinition[];
    compileOptions: CompileOption[];
    linkOptions: LinkOption[];
    compilers: Compiler[];
    validate(project: Project): { valid: boolean; hints: string[] };
};

export type ImportDesc = NamedItem & {
    url: string;
    ref?: string;
    files?: string[];
};

export type Import = NamedItem & ImportedItem & {
    url: string;
    ref: string | undefined;
    importErrors: unknown[];
    // each import can have multiple modules
    modules: FibsModule[];
};

export type TargetArrayItemsDesc = {
    interface?: string[];
    private?: string[];
    public?: string[];
};

export type TargetArrayItems = Required<TargetArrayItemsDesc>;

export type TargetRecordItemsDesc = {
    interface?: Record<string, string>;
    private?: Record<string, string>;
    public?: Record<string, string>;
};

export type TargetRecordItems = Required<TargetRecordItemsDesc>;

export type TargetJob = {
    job: string;
    args: unknown;
};

export type TargetDesc = NamedItem & {
    type: TargetType;
    dir?: string;
    sources: string[];
    deps?: string[];
    libs?: string[];
    includeDirectories?: IncludeDirectoriesDesc[];
    compileDefinitions?: CompileDefinitionsDesc[];
    compileOptions?: CompileOptionsDesc[];
    linkOptions?: LinkOptionsDesc[];
    jobs?: TargetJob[];
};

export type Target = NamedItem & ImportedItem & {
    type: TargetType;
    dir?: string;
    sources: string[];
    deps: string[];
    libs: string[];
    includeDirectories: IncludeDirectory[];
    compileDefinitions: CompileDefinition[];
    compileOptions: CompileOption[];
    linkOptions: LinkOption[];
    jobs: TargetJob[];
};

export type JobFunc = (project: Project) => Job;

export type JobBuilderDesc = NamedItem & {
    help(): void;
    validate(args: unknown): { valid: boolean; hints: string[] };
    build(args: unknown): JobFunc;
};

export type JobBuilder = ImportedItem & JobBuilderDesc;

export type Job = NamedItem & {
    inputs: string[];
    outputs: string[];
    addOutputsToTargetSources: boolean;
    args: unknown;
    func: (inputs: string[], output: string[], args: unknown) => Promise<void>;
};

export type CommandDesc = NamedItem & {
    help(): void;
    run(project: Project): Promise<void>;
};
export type Command = ImportedItem & CommandDesc;

export type RunnerDesc = NamedItem & {
    run(project: Project, config: Config, target: Target, options: RunOptions): Promise<void>;
};
export type Runner = ImportedItem & RunnerDesc;

export type OpenerDesc = NamedItem & {
    generate(project: Project, config: Config): Promise<void>;
    open(project: Project, config: Config): Promise<void>;
};
export type Opener = ImportedItem & OpenerDesc;

/** options for running a command line tool */
export type RunOptions = {
    /** command line arguments */
    args: string[];
    /** optional current working directory to run the command in */
    cwd?: string;
    /** whether to print or capture stdout */
    stdout?: 'inherit' | 'piped';
    /** whether to print or capture stderr */
    stderr?: 'inherit' | 'piped';
    /** whether to log the cmdline before executing */
    showCmd?: boolean;
    /** whether to abort on error */
    abortOnError?: boolean;
    /** whether to run via 'cmd /c' on Windows */
    winUseCmd?: boolean;
};

/** result of running a command line tool */
export type RunResult = {
    /** the exit code of the command (zero on success) */
    exitCode: number;
    /** captured stdout */
    stdout: string;
    /** captured stderr */
    stderr: string;
};

export type ToolDesc = NamedItem & {
    platforms: string[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
};
export type Tool = ImportedItem & ToolDesc;

export type AdapterConfigureResult = {
    compiler: Compiler;
};

export type AdapterBuildOptions = {
    buildTarget?: string;
    forceRebuild?: boolean;
};

export type AdapterDesc = NamedItem & {
    configure(project: Project, config: Config): Promise<AdapterConfigureResult>;
    generate(project: Project, config: Config): Promise<void>;
    build(project: Project, config: Config, options: AdapterBuildOptions): Promise<void>;
};
export type Adapter = ImportedItem & AdapterDesc;
