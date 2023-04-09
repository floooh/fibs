export type ProjectDesc = {
    name?: string;
    variables?: Record<string, string | boolean>;
    includeDirectories?: string[] | ProjectListFunc;
    compileDefinitions?: string[] | ProjectListFunc;
    compileOptions?: string[] | ProjectListFunc;
    linkOptions?: string[] | ProjectListFunc;
    imports?: Record<string, ImportDesc>;
    targets?: Record<string, TargetDesc>;
    commands?: Record<string, CommandDesc>;
    tools?: Record<string, ToolDesc>;
    jobs?: Record<string, JobTemplateDesc>;
    runners?: Record<string, RunnerDesc>;
    openers?: Record<string, OpenerDesc>;
    configs?: Record<string, ConfigDesc>;
    adapters?: Record<string, AdapterDesc>;
    settings?: Record<string, SettingsItem>;
};

export type ConfigDescWithImportDir = ConfigDesc & { importDir: string };

export type Project = {
    name: string;
    dir: string;
    settings: Settings;
    variables: Record<string, string | boolean>;
    includeDirectories: (string | ProjectListFunc)[];
    compileDefinitions: (string | ProjectListFunc)[];
    compileOptions: (string | ProjectListFunc)[];
    linkOptions: (string | ProjectListFunc)[];
    imports: Record<string, Import>;
    targets: Record<string, Target>;
    commands: Record<string, Command>;
    tools: Record<string, Tool>;
    jobs: Record<string, JobTemplate>;
    runners: Record<string, Runner>;
    openers: Record<string, Opener>;
    configs: Record<string, Config>;
    configDescs: Record<string, ConfigDescWithImportDir>;
    adapters: Record<string, Adapter>;
};

export type SettingsItem = {
    default: string;
    value: string;
    validate(project: Project, value: string): { valid: boolean; hint: string };
};

export type Settings = Record<string, SettingsItem>;

export type Arch = 'x86_64' | 'arm64' | 'wasm32';

export type Platform =
    | 'ios'
    | 'linux'
    | 'macos'
    | 'windows'
    | 'wasi'
    | 'emscripten'
    | 'android';

export type Compiler = 'msvc' | 'gcc' | 'clang' | 'appleclang';

export type Language = 'c' | 'cxx';

export type TargetType = 'plain-exe' | 'windowed-exe' | 'lib' | 'dll' | 'interface';

export type BuildType = 'release' | 'debug';

export type ConfigDesc = {
    ignore?: boolean;
    inherits?: string;
    platform?: Platform;
    runner?: string;
    opener?: string;
    buildType?: BuildType;
    generator?: string;
    arch?: Arch;
    toolchainFile?: string;
    cmakeVariables?: Record<string, string | boolean>;
    environment?: Record<string, string>;
    options?: Record<string, any>;
    includeDirectories?: string[];
    compileDefinitions?: string[];
    compileOptions?: string[];
    linkOptions?: string[];
};

export type Config = {
    name: string;
    importDir: string;
    platform: Platform;
    runner: Runner;
    opener: Opener | undefined;
    buildType: BuildType;
    generator: string | undefined;
    arch: Arch | undefined;
    toolchainFile: string | undefined;
    cmakeVariables: Record<string, string | boolean>;
    environment: Record<string, string>;
    options: Record<string, any>;
    includeDirectories: string[];
    compileDefinitions: string[];
    compileOptions: string[];
    linkOptions: string[];
};

export type ImportDesc = {
    url: string;
    ref?: string;
    project?: ProjectDesc;
    import?: string[];
};

export type Import = {
    name: string;
    importDir: string;
    importErrors: Error[];
    url: string;
    ref: string | undefined;
};

export type ProjectBuildContext = {
    project: Project;
    config: Config;
    compiler?: Compiler;
    language?: Language;
};

export type ProjectListFunc = (context: ProjectBuildContext) => string[];

export type TargetBuildContext = {
    project: Project;
    config: Config;
    target: Target;
    compiler?: Compiler;
    language?: Language;
};

export type TargetListFunc = (context: TargetBuildContext) => string[];

export type TargetItemsDesc = {
    interface?: string[] | TargetListFunc;
    private?: string[] | TargetListFunc;
    public?: string[] | TargetListFunc;
};

export type TargetItems = {
    interface: (string | TargetListFunc)[];
    private: (string | TargetListFunc)[];
    public: (string | TargetListFunc)[];
};

export type TargetJobDesc = {
    job: string;
    args: any;
}

export type TargetJob = {
    job: string;
    args: any;
}

export type TargetEnabledFunc = (context: ProjectBuildContext) => boolean;

export type TargetDesc = {
    type?: TargetType;
    enabled?: boolean | TargetEnabledFunc;
    dir?: string;
    sources?: string[] | TargetListFunc;
    libs?: string[] | TargetListFunc;
    includeDirectories?: TargetItemsDesc;
    compileDefinitions?: TargetItemsDesc;
    compileOptions?: TargetItemsDesc;
    linkOptions?: TargetItemsDesc;
    jobs?: TargetJobDesc[];
};

export type JobBuilder = (context: TargetBuildContext) => Job;

export type Target = {
    name: string;
    importDir: string;
    dir: string | undefined;
    type: TargetType;
    enabled: boolean | TargetEnabledFunc;
    sources: (string | TargetListFunc)[];
    libs: (string | TargetListFunc)[];
    includeDirectories: TargetItems;
    compileDefinitions: TargetItems;
    compileOptions: TargetItems;
    linkOptions: TargetItems;
    jobs: TargetJob[];
};

export type JobValidateResult = {
    valid: boolean;
    hints: string[];
};

export interface JobTemplateDesc {
    help(): void;
    validate(args: any): JobValidateResult;
    builder(args: any): JobBuilder;
}

export interface JobTemplate {
    name: string;
    importDir: string;
    help(): void;
    validate(args: any): JobValidateResult;
    builder(args: any): JobBuilder;
}

export type Job = {
    name: string;
    inputs: string[];
    outputs: string[];
    addOutputsToTargetSources: boolean;
    args: any;
    func: (inputs: string[], output: string[], args: any) => Promise<void>;
};

export interface CommandDesc {
    help(): void;
    run(project: Project): Promise<void>;
}

export interface Command {
    name: string;
    importDir: string;
    help(): void;
    run(project: Project): Promise<void>;
}

export interface RunnerDesc {
    run(project: Project, config: Config, target: Target, options: RunOptions): Promise<void>;
}

export interface Runner {
    name: string;
    importDir: string;
    run(project: Project, config: Config, target: Target, options: RunOptions): Promise<void>;
}

export interface OpenerDesc {
    configure(project: Project, config: Config): Promise<void>;
    open(project: Project, config: Config): Promise<void>;
}

export interface Opener {
    name: string;
    importDir: string;
    configure(project: Project, config: Config): Promise<void>;
    open(project: Project, config: Config): Promise<void>;
}

export type RunOptions = {
    args: string[];
    cwd?: string;
    stdout?: 'inherit' | 'piped';
    stderr?: 'inherit' | 'piped';
    showCmd?: boolean;
    abortOnError?: boolean;
    winUseCmd?: boolean;
};

export type RunResult = {
    exitCode: number;
    stdout: string;
    stderr: string;
};

export type ToolDesc = {
    platforms: Platform[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
};

export type Tool = {
    name: string;
    importDir: string;
    platforms: Platform[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
};

export type AdapterOptions = {
    buildTarget?: string;
    forceRebuild?: boolean;
};

export type AdapterDesc = {
    configure(project: Project, config: Config, options: AdapterOptions): Promise<void>;
    build(project: Project, config: Config, options: AdapterOptions): Promise<void>;
};

export type Adapter = {
    name: string;
    importDir: string;
    configure(project: Project, config: Config, options: AdapterOptions): Promise<void>;
    build(project: Project, config: Config, options: AdapterOptions): Promise<void>;
};
