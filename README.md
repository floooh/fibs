# fibs

A Typescript-based cmake wrapper and task runner that simplifies C/C++ project configuration and builds.

This is the spiritual successor to [fips](https://github.com/floooh/fips)

## Feature Overview

- describe C/C++ builds in Typescript instead of wrestling with cmake syntax
- runs on macOS, Linux and Windows
- IDE integration for VSCode, VStudio and Xcode
- import dependencies via git
- extenibility as core feature: build scripts and dependencies can add new commands, custom build jobs, IDE integrations and target platforms, all written in Typescript

## Getting Started

### Prerequisites

1. [Deno](https://docs.deno.com/runtime/getting_started/installation/)
2. [CMake](https://cliutils.gitlab.io/modern-cmake/chapters/intro/installing.html)
3. your system's vanilla C/C++ toolchain (GCC, Clang or MSVC)
4. optionally (but recommended): [Ninja](https://ninja-build.org/)

### Building the Hello World project

> [!NOTE]
> On Windows cmd.exe, run `fibs` instead of `./fibs`

Clone, build and run a native release build:

```bash
# clone
git clone https://github.com/floooh/fibs-hello-world
cd fibs-hello-world
# build with default build config
./fibs build
# run
./fibs run hello
```

If anything goes wrong, run `./fibs diag tools` to check if any required tools are missing.

To build a native debug build:

```bash
# on macOS:
./fibs config macos-make-debug
# on on Linux:
./fibs config linux-make-debug
# on Windows:
./fibs config win-vstudio-debug

./fibs build
./fibs run hello
```
