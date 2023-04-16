export type Context = {
    project: Project;
    config: Config;
    target?: Target;
    compiler?: Compiler;
    language?: Language;
    aliasMap: AliasMap;
    host: {
        platform: Platform;
        arch: Arch;
    };
};

export type Func<T> = (ctx: Context) => T;
export type BooleanFunc = Func<boolean>;
export type JobFunc = Func<Job>;
export type ArrayFunc<T> = Func<T[]>;
export type RecordFunc<T> = Func<Record<string,T|undefined>>; // the undefined is not a bug, needed as workaround for a TS type system wart
export type StringArrayFunc = ArrayFunc<string|undefined|null>;
export type StringRecordFunc = RecordFunc<string>;

export type CMakeVariables = Record<string, string | boolean>;
export type AliasMap = Record<string, string>;
export type ImportDescs = ImportDesc[];
export type TargetDescs = TargetDesc[];
export type CommandDescs = CommandDesc[]
export type ToolDescs = ToolDesc[];
export type JobTemplateDescs = JobTemplateDesc[];
export type RunnerDescs = RunnerDesc[];
export type OpenerDescs = OpenerDesc[];
export type ConfigDescs = ConfigDesc[];
export type AdapterDescs = AdapterDesc[];
export type SettingsItems = Record<string, SettingsItem>;

export type ProjectDesc = {
    name?: string;
    cmakeVariables?: CMakeVariables;
    includeDirectories?: StringArrayFunc;
    compileDefinitions?: StringRecordFunc;
    compileOptions?: StringArrayFunc;
    linkOptions?: StringArrayFunc;
    imports?: ImportDescs;
    targets?: TargetDescs;
    commands?: CommandDescs;
    tools?: ToolDescs;
    jobs?: JobTemplateDescs;
    runners?: RunnerDescs;
    openers?: OpenerDescs;
    configs?: ConfigDescs;
    adapters?: AdapterDescs;
    settings?: SettingsItems;
};

export type ConfigDescWithImportDir = ConfigDesc & { importDir: string };

export type Project = {
    name: string;
    dir: string;
    settings: Settings;
    cmakeVariables: CMakeVariables;
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

export interface NamedItem {
    name: string,
}

export interface ConfigDesc extends NamedItem {
    ignore?: boolean;
    inherits?: string;
    platform?: Platform;
    runner?: string;
    opener?: string;
    buildType?: BuildType;
    generator?: string;
    arch?: Arch;
    toolchainFile?: string;
    cmakeVariables?: CMakeVariables;
    environment?: Record<string, string>;
    options?: Record<string, any>;
    includeDirectories?: string[];
    compileDefinitions?: Record<string,string>;
    compileOptions?: string[];
    linkOptions?: string[];
}

export interface Config extends NamedItem {
    importDir: string;
    platform: Platform;
    runner: Runner;
    opener: Opener | undefined;
    buildType: BuildType;
    generator: string | undefined;
    arch: Arch | undefined;
    toolchainFile: string | undefined;
    cmakeVariables: CMakeVariables;
    environment: Record<string, string>;
    options: Record<string, any>;
    includeDirectories: string[];
    compileDefinitions: Record<string,string>;
    compileOptions: string[];
    linkOptions: string[];
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

export type TargetJobDesc = {
    job: string;
    args: any;
}

export type TargetJob = {
    job: string;
    args: any;
}

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
    jobs?: TargetJobDesc[];
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
    jobs: TargetJob[];
}

export type JobValidateResult = {
    valid: boolean;
    hints: string[];
}

export interface JobTemplateDesc extends NamedItem {
    help(): void;
    validate(args: any): JobValidateResult;
    builder(args: any): JobFunc;
}

export interface JobTemplate extends NamedItem {
    importDir: string;
    help(): void;
    validate(args: any): JobValidateResult;
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

export interface ToolDesc extends NamedItem {
    platforms: Platform[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
}

export interface Tool extends NamedItem {
    importDir: string;
    platforms: Platform[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
}

export type AdapterOptions = {
    buildTarget?: string;
    forceRebuild?: boolean;
};

export interface AdapterDesc extends NamedItem {
    configure(project: Project, config: Config, options: AdapterOptions): Promise<void>;
    build(project: Project, config: Config, options: AdapterOptions): Promise<void>;
}

export interface Adapter extends NamedItem {
    importDir: string;
    configure(project: Project, config: Config, options: AdapterOptions): Promise<void>;
    build(project: Project, config: Config, options: AdapterOptions): Promise<void>;
}
