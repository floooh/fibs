# Using Fibs

- [Getting help](#getting-help)
- [Selecting a build config](#selecting-a-build-config)
- [Building the project](#building-the-project)
- [Running a compiled executable](#running-a-compiled-executable)


## Getting help

Run `./fibs help` to see all available commands:

```bash
./fibs help
```
This will list both builtin commands and custom commands imported from
dependencies.

To show the help for one specific command, run:

```bash
./fibs help [cmdname]
```

...for instance to see the help for the `build` command:

```bash
./fibs help build
```

## Selecting a build config

A 'build config' groups a related set of build settings under a single name.

To see a list of all build configs, run:

```bash
./fibs list configs
```

The output will look something like this:

```bash
win-vstudio-release
win-vstudio-debug
win-vscode-release
win-vscode-debug
macos-make-release
macos-make-debug
macos-ninja-release
macos-ninja-debug
...
```

The list will also include build configs imported from dependencies and build
configs for other platforms (e.g. configs that may not actually work on the
current platform).

To select a specific build config, run `./fibs config [config-name]`, for instance:

```bash
./fibs config macos-make-debug
```

Under the hood this will configure the project and generate a `CMakeLists.txt`
and `CMakePresets.json` in the project root directory.

Alternatively run with the `--verbose` option to see more detailed terminal output:

```bash
./fibs config macos-ninja-debug --verbose
=> cmake --preset macos-ninja-debug (in /Users/floh/projects/fibs-hello-world/.fibs/config/macos-ninja-debug)
-- The C compiler identification is AppleClang 17.0.0.17000603
-- The CXX compiler identification is AppleClang 17.0.0.17000603
-- Detecting C compiler ABI info
-- Detecting C compiler ABI info - done
-- Check for working C compiler: /usr/bin/cc - skipped
...
```

To display the currently selected build config, run

```bash
./fibs config --get
```

If no build config is selected, a default config will be used depending on the
host platform:

- macOS: `macos-make-release`
- Linux: `linux-make-release`
- Windows: `win-vstudio-release`

## Building the project

To build the entire project using the currently selected build config, run:

```bash
./fibs build
```

...alternatively, to only build a specific target run:

```bash
./fibs build [targetname]
```

To force a complete rebuild, run with the `--rebuild` cmdline argument:

```bash
./fibs build --rebuild
./fibs build [targetname] --rebuild
```

...to print a list of all build targets in the project run:

```bash
./fibs list targets
```

## Running a compiled executable

To run a compiled executable target:

```bash
./fibs run [targetname]
```

...to print a list of runnable targets, run:

```bash
./fibs list targets --exe
```

For instance in the [fibs-hello-world](https://github.com/floooh/fibs-hello-world) project:

```bash
./fibs list targets --exe
hello: plain-exe => /Users/floh/projects/fibs-hello-world
```
```bash
./fibs run hello
Hello World!
```