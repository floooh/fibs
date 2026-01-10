# fibs

*Floh's Infernal Build System*

A Typescript-based cmake wrapper and task runner that simplifies C/C++ project configuration and builds.

This is the spiritual successor to [fips](https://github.com/floooh/fips).

```bassh
./fibs config wasi-ninja-debug
./fibs build
./fibs run hello
```

## Features

- describe C/C++ builds in Typescript instead of wrestling with cmake syntax
- runs on macOS, Linux and Windows
- IDE integration for VSCode, VStudio and Xcode
- import dependencies via git
- extenibility as core feature: build scripts and dependencies can add new commands, custom build jobs, IDE integrations and target platforms, all written in Typescript

## Documentation

Essentials:

- [Getting Started](./docs/01_getting_started.md)
- [Troubleshooting](./docs/02_troubleshooting.md)
- [Usage](./docs/03_usage.md)

For more details:

- [Table of Content](./docs/index.md)

## Main Differences to Fips

- everything is Typescript instead of a mix of Python, YAML and cmake-script
- all dependencies and output files are stored within the project directory instead of 'sister directories' (instead there's now an `npm link` like mechanism for doing dev-work on dependencies)
- new target platforms (e.g. WASI, Emscripten) and IDE integrations can now be added in regular dependencies instead of submitting fibs PRs
- more flexible non-intrusive 'fibsification' of C/C++ libraries, 3rd party libraries can now be pulled in as regular imports instead of wrestling with git submodules