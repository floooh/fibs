export type ArgOrFunc<T> = T | (() => T);

export function getArg<T>(arg: ArgOrFunc<T>): T {
    if (typeof arg === 'function') {
        return (arg as () => T)();
    } else {
        return arg;
    }
}

export type Configurer = {
    setProjectName(name: string): void;
    addCmakeVariable(name: string, value: string | boolean): void;
    addImport(imp: ArgOrFunc<ImportDesc>): void;
    addCommand(cmd: ArgOrFunc<CommandDesc>): void;
    addJob(job: ArgOrFunc<JobBuilderDesc>): void;
    addTool(tool: ArgOrFunc<ToolDesc>): void;
    addRunner(runner: ArgOrFunc<RunnerDesc>): void;
    addOpener(opener: ArgOrFunc<OpenerDesc>): void;
    addConfig(config: ArgOrFunc<ConfigDesc>): void;
    addAdapter(adapter: ArgOrFunc<AdapterDesc>): void;
    addSetting(setting: ArgOrFunc<SettingDesc>): void;

    hostPlatform(): Platform;
    hostArch(): Arch;
};

export type ProjectInfo = {
    name(): string;
    config(configName: string): Config;
    target(targetName: string): Target;
    adapter(adapterName: string): Adapter;
    command(commandName: string): Command;
    import(importName: string): Import;
    tool(toolName: string): Tool;
    activeConfig(): Config;
    arch(): Arch;
    platform(): Platform;
    compiler(): Compiler;
    buildMode(): BuildMode;
    hostPlatform(): Platform;
    hostArch(): Arch;
    dir(): string;
    fibsDir(): string;
    sdkDir(): string;
    buildDir(configName?: string): string;
    distDir(configName?: string): string;
    importsDir(): string;
    targetBuildDir(targetName: string, configName?: string): string;
    targetDistDir(targetName: string, configName?: string): string;
    targetAssetsDir(targetName: string, configName?: string): string;
    isArch(arch: Arch): boolean;
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
    isBuildMode(buildMode: BuildMode): boolean;
    isDebug(): boolean;
    isRelease(): boolean;
};

export type Builder = ProjectInfo & {
    addTarget(target: ArgOrFunc<TargetDesc>): void;
    addIncludeDirectory(dir: string): void;
    addCompileDefinition(key: string, value?: string): void;
    addCompileOption(opt: string): void;
    addLinkOption(opt: string): void;
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

export type Platform = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'emscripten' | 'wasi';

export type Compiler = 'msvc' | 'gcc' | 'clang' | 'appleclang' | 'unknown-compiler';

export type Generator = 'vstudio' | 'xcode' | 'ninja' | 'make';

export type Language = 'c' | 'cxx';

export type TargetType = 'plain-exe' | 'windowed-exe' | 'lib' | 'dll' | 'interface';

export type BuildMode = 'release' | 'debug';

export type Project = ProjectInfo & {
    settings: Setting[];
    cmakeVariables: CmakeVariable[];
    includeDirectories: string[];
    compileDefinitions: Record<string, string>;
    compileOptions: string[];
    linkOptions: string[];
    imports: Import[];
    targets: Target[];
    commands: Command[];
    tools: Tool[];
    jobs: JobBuilder[];
    runners: Runner[];
    openers: Opener[];
    configs: Config[];
    adapters: Adapter[];
};

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
    options?: Record<string, any>;
    includeDirectories?: string[];
    compileDefinitions?: Record<string, string>;
    compileOptions?: string[];
    linkOptions?: string[];
    compilers?: Compiler[];
    validate?(project: Project): { valid: boolean; hints: string[] };
};

export type Config = NamedItem & ImportedItem & {
    platform: Platform;
    buildMode: BuildMode;
    runner: string;
    opener?: string;
    generator?: Generator;
    arch?: Arch;
    toolchainFile?: string;
    cmakeIncludes: string[];
    cmakeVariables: Record<string, string | boolean>;
    environment: Record<string, string>;
    options: Record<string, any>;
    includeDirectories: string[];
    compileDefinitions: Record<string, string>;
    compileOptions: string[];
    linkOptions: string[];
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
    type?: TargetType;
    dir?: string;
    sources?: string[];
    deps?: string[];
    libs?: string[];
    includeDirectories?: TargetArrayItemsDesc;
    compileDefinitions?: TargetRecordItemsDesc;
    compileOptions?: TargetArrayItemsDesc;
    linkOptions?: TargetArrayItemsDesc;
    jobs?: TargetJob[];
};

export type Target = NamedItem & ImportedItem & {
    type: TargetType;
    dir: string;
    sources: string[];
    deps: string[];
    libs: string[];
    includeDirectories: TargetArrayItems;
    compileDefinitions: TargetRecordItems;
    compileOptions: TargetArrayItems;
    linkOptions: TargetArrayItems;
    jobs: TargetJob[];
};

export type JobFunc = (project: Project) => Job;

export type JobBuilderDesc = NamedItem & {
    help(): void;
    validate(args: any): { valid: boolean; hints: string[] };
    build(args: any): JobFunc;
};

export type JobBuilder = ImportedItem & JobBuilderDesc;

export type Job = NamedItem & {
    inputs: string[];
    outputs: string[];
    addOutputsToTargetSources: boolean;
    args: any;
    func: (inputs: string[], output: string[], args: any) => Promise<void>;
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
    configure(project: Project, config: Config): Promise<void>;
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

export type AdapterOptions = {
    buildTarget?: string;
    forceRebuild?: boolean;
};
export type AdapterDesc = NamedItem & {
    configure(project: Project, config: Config, options: AdapterOptions): Promise<void>;
    build(project: Project, config: Config, options: AdapterOptions): Promise<void>;
};
export type Adapter = ImportedItem & AdapterDesc;
