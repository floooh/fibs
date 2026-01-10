# fibs

*Floh's Infernal Build System*

A Typescript-based cmake wrapper and task runner that simplifies C/C++ project configuration and builds.

This is the spiritual successor to [fips](https://github.com/floooh/fips).

```bassh
./fibs config wasi-ninja-debug
./fibs build
./fibs run hello
```

[Getting Started](./docs/01_getting_started.md) • [Troubleshooting](./docs/02_troubleshooting.md) • [Usage](./docs/03_usage.md)

Or see the [complete documentation](./docs/index.md).

## Features

- describe C/C++ builds in Typescript instead of wrestling with cmake syntax
- runs on macOS, Linux and Windows
- extensible IDE integration (comes with builtin support for VSCode, VStudio and Xcode)
- import dependencies via git
- extensibility as core feature:
  - add subcommands for custom workflows and automation
  - custom build jobs for code generation or invoking external build tools (shader compilers, asset exporters, etc...)
  - add new target platforms and IDE integrations
  - ...all written in Typescript/Deno

## Main Differences to Fips

- everything is Typescript instead of a mix of Python, YAML and cmake-script
- dependencies and output files are now stored within the project directory instead of 'sister directories'
- new target platforms (e.g. WASI, Emscripten) and IDE integrations can now be added in regular dependencies instead of submitting fibs PRs
- more flexible non-intrusive 'fibsification' of C/C++ libraries, 3rd party libraries can now be pulled in as regular imports instead of wrestling with git submodules