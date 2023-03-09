export type ProjectDesc = {
    name?: string;
    imports?: Record<string, ImportDesc>;
    targets?: Record<string, TargetDesc>;
    commands?: Record<string, CommandDesc>;
    tools?: Record<string, ToolDesc>;
    configs?: Record<string, ConfigDesc>;
    adapters?: Record<string, AdapterDesc>;
    settings?: Record<string, SettingsItem>;
};

export type ConfigDescWithImportDir = ConfigDesc & { importDir: string };

export type Project = {
    name: string;
    dir: string;
    settings: Settings;
    imports: Record<string, Import>;
    targets: Record<string, Target>;
    commands: Record<string, Command>;
    tools: Record<string, Tool>;
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

export type TargetType = 'plain-exe' | 'windowed-exe' | 'lib' | 'dll' | 'void';

export type BuildType = 'release' | 'debug';

export type ConfigDesc = {
    ignore?: boolean;
    inherits?: string;
    platform?: Platform;
    buildType?: BuildType;
    generator?: string;
    arch?: Arch;
    toolchainFile?: string;
    variables?: Record<string, string | boolean>;
    environment?: Record<string, string>;
    defines?: Record<string, string>;
};

export type Config = {
    name: string;
    importDir: string;
    platform: Platform;
    buildType: BuildType;
    generator: string | undefined;
    arch: Arch | undefined;
    toolchainFile: string | undefined;
    variables: Record<string, string | boolean>;
    environment: Record<string, string>;
    defines: Record<string, string>;
};

export type ImportDesc = {
    url: string;
    ref?: string;
    projectDesc?: ProjectDesc;
};

export type Import = {
    name: string;
    importDir: string;
    url: string;
    ref: string | null;
}

export type TargetIncludeDirectoriesDesc = string[] | {
    system?: boolean;
    interface?: string[];
    private?: string[];
    public?: string[];
};

export type TargetIncludeDirectories = {
    system: boolean;
    interface: string[];
    private: string[];
    public: string[];
};

export type TargetCompileDefinitionsDesc = Record<string, string> | {
    interface?: Record<string, string>;
    private?: Record<string, string>;
    public?: Record<string, string>;
};

export type TargetCompileDefinitions = {
    interface: Record<string, string>;
    private: Record<string, string>;
    public: Record<string, string>;
};

export type TargetCompileOptionsFunc = (project: Project, config: Config, compiler: Compiler) => TargetCompileOptions;

export type TargetCompileOptionsDesc = string[] | TargetCompileOptionsFunc | {
    interface?: string[];
    private?: string[];
    public?: string[];
};

export type TargetCompileOptions = {
    interface: string[];
    private: string[];
    public: string[];
};

export type TargetLinkOptionsFunc = (project: Project, config: Config, compiler: Compiler) => TargetLinkOptions;

export type TargetLinkOptionsDesc = string[] | TargetLinkOptionsFunc | {
    interface?: string[];
    private?: string[];
    public?: string[];
};

export type TargetLinkOptions = {
    interface: string[];
    private: string[];
    public: string[];
};

export type TargetDependencies = {
    libs: string[];
    frameworks: string[];
};

export type TargetDesc = {
    type: TargetType;
    dir?: string;
    sources?: string[];
    libs?: string[];
    frameworks?: string[];
    includeDirectories?: TargetIncludeDirectoriesDesc;
    compileDefinitions?: TargetCompileDefinitionsDesc;
    compileOptions?: TargetCompileOptionsDesc;
    linkOptions?: TargetLinkOptionsDesc;
};

export type Target = {
    name: string;
    importDir: string;
    dir: string | undefined;
    type: TargetType;
    sources: string[];
    deps: TargetDependencies;
    includeDirectories: TargetIncludeDirectories;
    compileDefinitions: TargetCompileDefinitions;
    compileOptions: TargetCompileOptions | TargetCompileOptionsFunc;
    linkOptions: TargetLinkOptions | TargetLinkOptionsFunc;
};

export interface CommandDesc {
    help(): void;
    run(project: Project): Promise<void>;
}

export interface Command {
    name: string;
    importDir: string;
    help(project: Project): void;
    run(project: Project): Promise<void>;
}

export type RunOptions = {
    args: string[];
    cwd?: string;
    stdout?: 'inherit' | 'piped';
    stderr?: 'inherit' | 'piped';
    showCmd?: boolean;
    abortOnError?: boolean;
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
