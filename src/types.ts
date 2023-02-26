export type ProjectDesc = {
    name: string;
    targets?: Target[];
    commands?: Command[];
    tools?: Tool[];
    configs?: Config[];
    adapters?: Adapter[];
};

export type Project = {
    name: string;
    dir: string;
    deps: Record<string, Project>;
    targets: Target[];
    commands: Record<string, Command>;
    tools: Record<string, Tool>;
    configs: Record<string, Config>;
    adapters: Record<string, Adapter>;
};

export enum Arch {
    X86_64 = 'x86_64',
    Arm64 = 'arm64',
    Wasm32 = 'wasm32',
}

export enum Platform {
    IOS = 'ios',
    Linux = 'linux',
    Macos = 'macos',
    Windows = 'windows',
    Wasi = 'wasi',
    Emscripten = 'emscripten',
    Android = 'android',
}

export enum Compiler {
    MSVC = 'msvc',
    GCC = 'gcc',
    Clang = 'clang',
    AppleClang = 'appleclang',
}

export enum TargetType {
    CmdLineExe = 'cmdline_exe',
    WindowedExe = 'windowed_exe',
    Lib = 'lib',
    DLL = 'dll',
}

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

export type Config = {
    name: string;
    generator?: string;
    arch?: Arch;
    platform: Platform;
    toolchain?: string;
    variables?: Record<string, string | boolean>;
    environment?: Record<string, string>;
};

export type Target = {
    name: string;
    type: TargetType;
    sources: string[],
    deps?: TargetDependencies | TargetDependencies[];
    includeDirectories?: TargetIncludeDirectories | TargetIncludeDirectories[];
    compileDefinitions?: TargetCompileDefinitions | TargetCompileDefinitions[];
    compileOptions?: TargetCompileOptions | TargetCompileOptions[];
    linkOptions?: TargetLinkOptions | TargetLinkOptions[];
};

export interface Command {
    name: string;
    help(project: Project): void;
    run(project: Project): Promise<void>;
}

export type ToolRunOptions = {
    args: string[],
    cwd?: string,
    stdout?: 'inherit' | 'piped',
    stderr?: 'inherit' | 'piped',
}

export type ToolRunResult = {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface Tool {
    name: string;
    platforms: Platform[];
    optional: boolean;
    notFoundMsg: string;
    exists(): Promise<boolean>;
    run(options: ToolRunOptions): Promise<ToolRunResult>;
}

export interface Adapter {
    name: string,
    generate(project: Project, config: Config): Promise<void>;
    build(project: Project, config: Config): Promise<void>;
}
