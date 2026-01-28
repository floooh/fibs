# Getting Started
[⇦ back](./index.md)
- [Prerequisites](#prerequisites)
- [Building the Hello World project](#building-the-hello-world-project)
- [Open the project in an IDE](#open-the-project-in-an-ide)
- [Build the Hello World example for WASI](#build-the-hello-world-example-for-wasi)


## Prerequisites

1. [Deno](https://docs.deno.com/runtime/getting_started/installation/)
2. [CMake](https://cliutils.gitlab.io/modern-cmake/chapters/intro/installing.html)
3. your system's vanilla C/C++ toolchain (GCC, Clang or MSVC)
4. optional (but recommended): [Ninja](https://ninja-build.org/)

## Building the Hello World project

> [!NOTE]
> On Windows cmd.exe, run `fibs` instead of `./fibs`

> [!NOTE]
> On Windows with VS2026, you need a very recent cmake (4.2+) and
> everything needs to run inside the *Developer Command Prompt for VS*
> (earlier VS versions also work outside the developer command prompt)

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

## Open the project in an IDE

1. Configure with one of the IDE build configs, e.g.:
    ```bash
    # on macOS:
    ./fibs config macos-xcode-debug
    ./fibs config macos-vscode-debug
    # on Windows:
    ./fibs config win-vstudio-debug
    ./fibs config win-vscode-debug
    # on Linux:
    ./fibs config linux-vscode-debug
    ```

2. then run `./fibs open` to open the project in VSCode, XCode or VStudio:
    ```bash
    ./fibs open
    ```

## Build the Hello World example for WASI

...in the `fibs-hello-world` directory from above:

1. Run `./fibs diag tools` and make sure that `ninja`, `tar` and `wasmtime` is installed and found:

    ```bash
    ./fibs diag tools
    ...
    ninja:  found
    ...
    tar:    found
    wasmtime:       found
    ```

2. Install the WASI SDK:

    ```bash
    ./fibs wasisdk install
    ```

3. Run `./fibs list configs`, note the `wasi-*` configs:

    ```bash
    ./fibs list configs
    ...
    wasi-make-debug
    wasi-make-release
    wasi-ninja-debug
    wasi-ninja-release
    wasi-vscode-debug
    wasi-vscode-release
    ```

4. Configure with `wasi-ninja-debug`, build and run:
    ```bash
    ./fibs config wasi-ninja-debug
    ./fibs build
    ./fibs run --verbose hello
    ```

5. Uninstall WASI SDK:
    ```bash
    ./fibs wasisdk uninstall
    ```
