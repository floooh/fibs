export type Context = {
    project: Project;
    config: Config;
    target?: Target;
    compiler?: Compiler;
    language?: Language;
    aliasMap: Record<string, string>;
    host: {
        platform: string;
        arch: Arch;
    };
};

export type Func<T> = (ctx: Context) => T;
export type BooleanFunc = Func<boolean>;
export type JobFunc = Func<Job>;
export type ArrayFunc<T> = Func<T[]>;
export type RecordFunc<T> = Func<Record<string, T | undefined>>;
export type StringArrayFunc = ArrayFunc<string | undefined | null>;
export type StringRecordFunc = RecordFunc<string>;
export type TargetJobArrayFunc = ArrayFunc<TargetJob | undefined | null>;

export type ProjectDesc = {
    name?: string;
    cmakeVariables?: Record<string, string | boolean>;
    includeDirectories?: StringArrayFunc;
    compileDefinitions?: StringRecordFunc;
    compileOptions?: StringArrayFunc;
    linkOptions?: StringArrayFunc;
    imports?: ImportDesc[];
    targets?: TargetDesc[];
    commands?: CommandDesc[];
    tools?: ToolDesc[];
    jobs?: JobTemplateDesc[];
    runners?: RunnerDesc[];
    openers?: OpenerDesc[];
    configs?: ConfigDesc[];
    adapters?: AdapterDesc[];
    settings?: Record<string, SettingsItem>;
};

export type ConfigDescWithImportDir = ConfigDesc & { importDir: string };

export type Project = {
    name: string;
    dir: string;
    settings: Record<string, SettingsItem>;
    cmakeVariables: Record<string, string | boolean>;
    includeDirectories: StringArrayFunc[];
    compileDefinitions: StringRecordFunc[];
    compileOptions: StringArrayFunc[];
    linkOptions: StringArrayFunc[];
    imports: Import[];
    targets: Target[];
    commands: Command[];
    tools: Tool[];
    jobs: JobTemplate[];
    runners: Runner[];
    openers: Opener[];
    configs: Config[];
    configDescs: ConfigDescWithImportDir[];
    adapters: Adapter[];
};

export type SettingsItem = {
    default: string;
    value: string;
    validate(project: Project, value: string): { valid: boolean; hint: string };
};

export type Arch = 'x86_64' | 'arm64' | 'wasm32';

export type Compiler = 'msvc' | 'gcc' | 'clang' | 'appleclang' | 'unknown-compiler';

export type Language = 'c' | 'cxx';

export type TargetType = 'plain-exe' | 'windowed-exe' | 'lib' | 'dll' | 'interface';

export type BuildType = 'release' | 'debug';

export interface NamedItem {
    name: string;
}

export interface ConfigDesc extends NamedItem {
    ignore?: boolean;
    inherits?: string;
    platform?: string;
    runner?: string;
    opener?: string;
    buildType?: BuildType;
    generator?: string;
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
}

export interface Config extends NamedItem {
    importDir: string;
    platform: string;
    runner: Runner;
    opener: Opener | undefined;
    buildType: BuildType;
    generator: string | undefined;
    arch: Arch | undefined;
    toolchainFile: string | undefined;
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
}

export interface ImportDesc extends NamedItem {
    url: string;
    ref?: string;
    project?: ProjectDesc;
    import?: string[];
}

export interface Import extends NamedItem {
    importDir: string;
    importErrors: Error[];
    url: string;
    ref: string | undefined;
}

export type TargetArrayItemsDesc = {
    interface?: StringArrayFunc;
    private?: StringArrayFunc;
    public?: StringArrayFunc;
};

export type TargetArrayItems = {
    interface: StringArrayFunc[];
    private: StringArrayFunc[];
    public: StringArrayFunc[];
};

export type TargetRecordItemsDesc = {
    interface?: StringRecordFunc;
    private?: StringRecordFunc;
    public?: StringRecordFunc;
};

export type TargetRecordItems = {
    interface: StringRecordFunc[];
    private: StringRecordFunc[];
    public: StringRecordFunc[];
};

export type TargetJob = {
    job: string;
    args: any;
};

export interface TargetDesc extends NamedItem {
    type?: TargetType;
    enabled?: BooleanFunc;
    dir?: string;
    sources?: StringArrayFunc;
    libs?: StringArrayFunc;
    includeDirectories?: TargetArrayItemsDesc;
    compileDefinitions?: TargetRecordItemsDesc;
    compileOptions?: TargetArrayItemsDesc;
    linkOptions?: TargetArrayItemsDesc;
    jobs?: TargetJobArrayFunc;
}

export interface Target extends NamedItem {
    importDir: string;
    dir: string | undefined;
    type: TargetType;
    enabled: BooleanFunc;
    sources: StringArrayFunc[];
    libs: StringArrayFunc[];
    includeDirectories: TargetArrayItems;
    compileDefinitions: TargetRecordItems;
    compileOptions: TargetArrayItems;
    linkOptions: TargetArrayItems;
    jobs: TargetJobArrayFunc[];
}

export interface JobTemplateDesc extends NamedItem {
    help(): void;
    validate(args: any): { valid: boolean; hints: string[] };
    builder(args: any): JobFunc;
}

export interface JobTemplate extends NamedItem {
    importDir: string;
    help(): void;
    validate(args: any): { valid: boolean; hints: string[] };
    builder(args: any): JobFunc;
}

export interface Job extends NamedItem {
    inputs: string[];
    outputs: string[];
    addOutputsToTargetSources: boolean;
    args: any;
    func: (inputs: string[], output: string[], args: any) => Promise<void>;
}

export interface CommandDesc extends NamedItem {
    help(): void;
    run(project: Project): Promise<void>;
}

export interface Command extends NamedItem {
    importDir: string;
    help(): void;
    run(project: Project): Promise<void>;
}

export interface RunnerDesc extends NamedItem {
    run(project: Project, config: Config, target: Target, options: RunOptions): Promise<void>;
}

export interface Runner extends NamedItem {
    importDir: string;
    run(project: Project, config: Config, target: Target, options: RunOptions): Promise<void>;
}

export interface OpenerDesc extends NamedItem {
    configure(project: Project, config: Config): Promise<void>;
    open(project: Project, config: Config): Promise<void>;
}

export interface Opener extends NamedItem {
    importDir: string;
    configure(project: Project, config: Config): Promise<void>;
    open(project: Project, config: Config): Promise<void>;
}

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

export interface ToolDesc extends NamedItem {
    platforms: string[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
}

export interface Tool extends NamedItem {
    importDir: string;
    platforms: string[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
}

export interface AdapterDesc extends NamedItem {
    configure(project: Project, config: Config, options: { buildTarget?: string; forceRebuild?: boolean }): Promise<void>;
    build(project: Project, config: Config, options: { buildTarget?: string; forceRebuild?: boolean }): Promise<void>;
}

export interface Adapter extends NamedItem {
    importDir: string;
    configure(project: Project, config: Config, options: { buildTarget?: string; forceRebuild?: boolean }): Promise<void>;
    build(project: Project, config: Config, options: { buildTarget?: string; forceRebuild?: boolean }): Promise<void>;
}
