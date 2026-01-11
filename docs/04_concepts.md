# Fibs Concepts

## 10000 ft view

When invoking `./fibs` it first looks for a file called `./fibs.ts` in the current
directory and runs specific exported functions to populate an internal `Project`
registry object with the following item types:

- [Imports](./06_imports.md): git repositories which may contains further build
scripts to recursively populate the `Project` registry further.
- [Build Configs](./07_configs.md): named groups of build configuration options,
these define the target platform, build mode (e.g. release vs debug), compiler toolchain
etc...
- [Compile-Targets and -Options](./05_build_scripting.md): e.g. the actual build
description which is then used to code-generate a CMakeLists.txt file
- [Commands](./08_commands.md): new fibs commands to implement custom workflows or
build automation (for instance a dependency might offer commands for installing
and maintaining platform SDKs like Emscripten or the WASI SDK, or add a commands
for building and deploying a webpage)
- [Build Jobs](./09_jobs.md): custom build jobs which are invoked during compilation,
commonly used for code generation or to invoke custom build tools (like shader
compilers or asset exporters)
- [Runners](./10_runners.md): custom code for running esoteric executable targets,
for instance running Emscripten-compiled WASM-blobs via `emrun` or WASI blobs via a
wasm runner like `wasmtime`
- [Openers](./11_openers.md): custom code for opening the project in an IDE like
VSCode, VStudio or Xcode. This is what gets executed when running `./fibs open`
- [Settings](./12_settings.md): persistent key/value pairs which can be set via
`./fibs set [key] [value]`.

## Import order and overrides

An important fibs concept is that dependencies 'closer' to the root project
can override items added by dependencies that are further away from the
build root.

This is mostly useful for changing the behaviour of imported dependencies in
the root project. For instance the root directory might want to redirect an
import further down in the dependency to a fork. This can simply be achieved
by defining an import of the same name in the root project's `fibs.ts` file
which points to another git url.

This 'controlled override by name' is not limited to imports but works
for all items in the `Project` registry and also works for builtin items like
standard build configs and even builtin fibs commands (with the exception of
the special commands `./fibs reset` and `./fibs init`).

## Code-generated cmake files

Fibs delegates the actual build-related heavy-lifting to cmake by generating
`CMakeLists.txt` and `CMakePresets.json` files and then running cmake to
generate build-tool specific project files and perform the actual build.

The generated cmake files are 'transient' and must not be committed to version
control because they are hardwired for a specific build configuation and
also contain absolute file paths.

The reason why those generated files live in the project root directory (as
opposed to being hidden away in the `.fibs` subdirectory is discoverability
by other tools. For instance when starting VSCode with the [CMake Tools extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools), the extension searches for a
`CMakeLists.txt` and optional `CMakePresets.json` file in the project directory.

## Build Jobs

In a nutshell, build jobs are Typescript functions which run during the actual
compilation process and transform one (ore more) input files into one (or more)
output files. Build job output files may themselves be inputs to the actual
compilation process (e.g. build jobs can generate C/C++ source files).

Authoring custom build jobs is described in detail [here](./09_jobs.md).