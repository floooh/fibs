export type Project = {
  name: string;
  path: string;
  verbs?: Record<string, Verb>;
  configs?: Record<string, Config>;
  targets?: Record<string, Target>;
}

export enum Arch {
  x86_64,
  arm64,
  wasm32,
}

export enum Platform {
  ios,
  linux,
  macos,
  windows,
  wasi,
  emscripten,
  android
}

export enum Compiler {
  msvc,
  gcc,
  clang,
  apple_clang,
}

export enum TargetType {
  exe,
  lib,
  dll,
}

export type TargetDependencies = {
  targets: string[];
  frameworks: string[];
  libs: string[];
}

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
}

export type TargetCompileDefinitions = {
  filter?: Filter;
  interface?: Record<string, string>;
  private?: Record<string, string>;
  public?: Record<string, string>;
}

export type TargetCompileOptions = {
  filter?: Filter;
  interface?: string[];
  private?: string[];
  public?: string[];
}

export type TargetLinkOptions = {
  filter?: Filter;
  interface?: string[];
  private?: string[];
  public?: string[];
}

export type TargetIncludeDirectories = {
  filter?: Filter;
  system?: boolean;
  interface?: string[];
  private?: string[];
  public?: string[];
}

export type Config = {
  name: string;
  generator?: string;
  arch?: Arch;
  platform: Platform;
  toolchain?: string;
  variables?: Record<string, string | boolean>;
  environment?: Record<string, string>;
}

export type Target = {
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
