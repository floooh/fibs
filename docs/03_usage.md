# Using Fibs

- [Getting help](#getting-help)
- [Selecting a build config](#selecting-a-build-config)
- [Building the project](#building-the-project)
- [Running a compiled executable](#running-a-compiled-executable)
- [Cleaning intermediate build files](#cleaning-intermediate-build-files)
- [Open the project in an IDE](#open-the-project-in-an-ide)
- [Updating imports](#updating-imports)
- [Linking and unlinking imports](#linking-and-unlinking-imports)


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

Running a target is delegated to a [Runner](./10_runners.md) which is a
property of the current build configuration. For instance Emscripten build
configs will invoke [emrun](https://emscripten.org/docs/compiling/Running-html-files-with-emrun.html) (which starts a web server and browser),
or WASI build configs will run a compiled WASI blob via [wasmtime](https://github.com/bytecodealliance/wasmtime).

## Cleaning intermediate build files

To clean all intermediate build files for the current configuration run:

```bash
./fibs clean
```

...to clean a specific build config, append the build config name. For instance:

```bash
./fibs clean linux-ninja-debug
```

...or to clean all build configs:

```bash
./fibs clean --all
```

## Open the project in an IDE

Build configurations may define an [Opener](./11_openers.md) which knows how
to open the project in an IDE. For instance the following builtin configs define
IDE openers:

```
win-vstudio-release
win-vstudio-debug
win-vscode-release
win-vscode-debug
macos-xcode-release
macos-xcode-debug
macos-vscode-release
macos-vscode-debug
linux-vscode-release
linux-vscode-debug
```

To open the project in an IDE, configure with one of the above build configs
and then run `./fibs open`, for instance:

```bash
./fibs config macos-xcode-debug
./fibs open
```

...this would open the project in Xcode. Trying to run this command on build
config without IDE integration prints an error message:

```
./fibs config macos-ninja-debug
./fibs open

[error] don't know how to open config 'macos-ninja-debug' (config has undefined opener)
```

## Updating imports

To update all imported dependencies run:

```bash
./fibs update
```

...to only update a specific dependency, append the import name:

```bash
./fibs update [importname]
```

...to print the list of imports, run:

```bash
./fibs list imports
```

To delete import directories before updating, or if you want to interactively
select which imports to update or skip, run:

```bash
./fibs update --clean
```

## Linking and unlinking imports

By default, imported dependencies will be cloned as a single commit and in
detached head state' into the project subdirectory `.fibs/imports/`. This
is useful for just building those dependencies, but not for doing any
development work.

Instead if you want to do development work on a dependency, clone the dependency
manually somewhere outside the project directory and 'link' it to the import.

This is a similar idea as the `npm link` feature.

For instance let's say your project has a dependency on [sokol](https://github.com/floooh/sokol):

```bash
./fibs list imports
sokol: https://github.com/floooh/sokol
```

When the import name is followed by a git url this means that the dependency is
not currently linked and the files live in the `.fibs/imports` subdirectory.

To link the `sokol` import to a regular local git repository so that development work
on sokol can happen, run `./fibs link sokol [localpath]`, e.g.:

```bash
# clone sokol outside the project directory:
git clone git@github.com/floooh/sokol ../sokol
# link the cloned directory:
./fibs link sokol ../sokol
  linked import 'sokol' to '/Users/floh/projects/sokol'
```

...when listing the imports, the `sokol` dependency will now look special:

```bash
./fibs list imports
sokol: link => /Users/floh/projects/sokol
```

Now you can do regular development work on the linked sokol repository, and
the changes will be picked up in the main project.

To 'unlink' an import and switch back to the internal version under `.fibs/imports`,
run:

```bash
./fibs unlink sokol
```

...in that case, don't forget to update the dependencies to pick up the latest
changes that were committed and pushed in the linked `sokol` directory:

```bash
./fibs update sokol
```
