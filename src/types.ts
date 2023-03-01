export type ProjectDesc = {
    name: string;
    targets?: Record<string, TargetDesc>;
    commands?: Record<string, CommandDesc>;
    tools?: Record<string, ToolDesc>;
    configs?: Record<string, ConfigDesc>;
    adapters?: Record<string, AdapterDesc>;
    settings?: Record<string, SettingsItem>;
};

export type Project = {
    name: string;
    dir: string;
    settings: Settings;
    targets: Target[];
    deps: Record<string, Project>;
    commands: Record<string, Command>;
    tools: Record<string, Tool>;
    configs: Record<string, Config>;
    adapters: Record<string, Adapter>;
};

export type SettingsItem = {
    default: string,
    value: string,
    validate(project: Project, value: string): { valid: boolean, hint: string },
}

export type Settings = Record<string, SettingsItem>;

export type Arch = 'x86_64' | 'arm64' | 'wasm32';

export type Platform =
    | 'ios'
    | 'linux'
    | 'macos'
    | 'ios'
    | 'windows'
    | 'wasi'
    | 'emscripten'
    | 'android';

export type Compiler = 'msvc' | 'gcc' | 'clang' | 'appleclang';

export type TargetType = 'plain-exe' | 'windowed-exe' | 'lib' | 'dll';

export type BuildType = 'release' | 'debug';

export type TargetDependencies = {
    targets: string[];
    frameworks: string[];
    libs: string[];
};

export type Filter = {
    arch: {
        is?: Arch[];
        not?: Arch[];
    };
    platform: {
        is?: Platform[];
        not?: Platform[];
    };
    compiler: {
        is?: Compiler[];
        not?: Compiler[];
    };
};

export type TargetCompileDefinitions = {
    filter?: Filter;
    interface?: Record<string, string>;
    private?: Record<string, string>;
    public?: Record<string, string>;
};

export type TargetCompileOptions = {
    filter?: Filter;
    interface?: string[];
    private?: string[];
    public?: string[];
};

export type TargetLinkOptions = {
    filter?: Filter;
    interface?: string[];
    private?: string[];
    public?: string[];
};

export type TargetIncludeDirectories = {
    filter?: Filter;
    system?: boolean;
    interface?: string[];
    private?: string[];
    public?: string[];
};

export type ConfigDesc = {
    ignore?: boolean,
    inherits?: string,
    platform?: Platform;
    buildType?: BuildType;
    generator?: string;
    arch?: Arch;
    toolchain?: string;
    variables?: Record<string, string | boolean>;
    environment?: Record<string, string>;
};

export type Config = {
    name: string;
    platform: Platform;
    buildType: BuildType;
    generator: string | null;
    arch: Arch | null;
    toolchain: string | null;
    variables: Record<string, string | boolean>;
    environment: Record<string, string>;
};

export type TargetDesc = {
    type: TargetType;
    sources: string[];
    deps?: TargetDependencies[];
    includeDirectories?: TargetIncludeDirectories[];
    compileDefinitions?: TargetCompileDefinitions[];
    compileOptions?: TargetCompileOptions[];
    linkOptions?: TargetLinkOptions[];
}

export type Target = {
    name: string;
    type: TargetType;
    sources: string[];
    deps: TargetDependencies[];
    includeDirectories: TargetIncludeDirectories[];
    compileDefinitions: TargetCompileDefinitions[];
    compileOptions: TargetCompileOptions[];
    linkOptions: TargetLinkOptions[];
};

export interface CommandDesc {
    help(project: Project): void;
    run(project: Project): Promise<void>;
}

export interface Command {
    name: string;
    help(project: Project): void;
    run(project: Project): Promise<void>;
}

export type ToolRunOptions = {
    args: string[];
    cwd?: string;
    stdout?: 'inherit' | 'piped';
    stderr?: 'inherit' | 'piped';
    showCmd?: boolean;
};

export type ToolRunResult = {
    exitCode: number;
    stdout: string;
    stderr: string;
};

export type ToolDesc = {
    platforms: Platform[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
}

export type Tool = {
    name: string;
    platforms: Platform[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
}

export type AdapterDesc = {
    generate(project: Project, config: Config): Promise<void>;
    build(project: Project, config: Config): Promise<void>;
}

export type Adapter = {
    name: string;
    generate(project: Project, config: Config): Promise<void>;
    build(project: Project, config: Config): Promise<void>;
}
