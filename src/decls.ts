export interface Project {
    name: string;
    path: string;
    verbs?: Verb[];
    configs?: Config[];
    targets?: Target[];
}

export type Arch = 'x86_64' | 'arm64' | 'wasm32';
export type Platform = 'ios' | 'linux' | 'macos' | 'windows' | 'wasi' | 'emscripten' | 'android';
export type Compiler = 'msvc' | 'gcc' | 'clang' | 'apple_clang';
export type TargetType = 'exe' | 'lib' | 'dll';

export interface TargetDependencies {
    targets: string[];
    frameworks: string[];
    libs: string[];
}

export interface Filter {
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
}

export interface TargetCompileDefinitions {
    filter?: Filter;
    interface?: Record<string, string>;
    private?: Record<string, string>;
    public?: Record<string, string>;
}

export interface TargetCompileOptions {
    filter?: Filter;
    interface?: string[];
    private?: string[];
    public?: string[];
}

export interface TargetLinkOptions {
    filter?: Filter;
    interface?: string[];
    private?: string[];
    public?: string[];
}

export interface TargetIncludeDirectories {
    filter?: Filter;
    system?: boolean;
    interface?: string[];
    private?: string[];
    public?: string[];
}

export interface Config {
    name: string;
    generator?: string;
    arch?: Arch;
    platform: Platform;
    toolchain?: string;
    variables?: Record<string, string | boolean>;
    environment?: Record<string, string>;
}

export interface Target {
    name: string;
    type: TargetType;
    deps?: TargetDependencies | TargetDependencies[];
    include_directories?: TargetIncludeDirectories | TargetIncludeDirectories[];
    compile_definitions?: TargetCompileDefinitions | TargetCompileDefinitions[];
    compile_options?: TargetCompileOptions | TargetCompileOptions[];
    link_options?: TargetLinkOptions | TargetLinkOptions[];
}

export interface Verb {
    name: string;
    help(project: Project): void;
    run(project: Project): void;
}
