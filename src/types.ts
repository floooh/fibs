export type Project = {
  name: string;
  path: string;
  commands?: Record<string, Command>;
  tools?: Record<string, Tool>;
  configs?: Record<string, Config>;
  targets?: Record<string, Target>;
};

export enum Arch {
  X86_64,
  Arm64,
  Wasm32,
}

export enum Platform {
  IOS,
  Linux,
  Macos,
  Windows,
  Wasi,
  Emscripten,
  Android,
}

export enum Compiler {
  MSVC,
  GCC,
  Clang,
  AppleClang,
}

export enum TargetType {
  Exe,
  Lib,
  DLL,
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

export interface Tool {
  name: string;
  platforms: Platform[];
  optional: boolean;
  notFoundMsg: string;
  exists(project: Project): Promise<boolean>;
}
