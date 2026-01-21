# Writing Build Scripts
[⇦ back](./index.md)

- [Anatomy of a fibs.ts file](#anatomy-of-a-fibsts-file)
- [Configure Phase](#configure-phase)
  - [Adding imports](#adding-imports)
  - [Import options](#import-options)
  - [Querying configure-phase information](#querying-configure-phase-information)
  - [More things to do in the configure phase](#more-things-to-do-in-the-configure-phase)
- [Build Phase](#build-phase)
  - [Defining the project name](#defining-the-project-name)
  - [Defining cmake variables](#defining-cmake-variables)
  - [Including cmake snippets](#including-cmake-snippets)
  - [Global header and library search paths](#global-header-and-library-search-paths)
  - [Global compile definitions](#global-compile-definitions)
  - [Global compile and link options](#global-compile-and-link-options)
  - [Adding build targets](#adding-build-targets)
    - [Target filesystem path resolution](#target-filesystem-path-resolution)
    - [Target dependencies and scopes](#target-dependencies-and-scopes)
    - [Filtering target properties by language and build mode](#filtering-target-properties-by-language-and-build-mode)
    - [Adding target build jobs](#adding-target-build-jobs)
  - [Querying build-phase information](#querying-build-phase-information)
- ['Fibsifying' existing libraries](#fibsifying-existing-libraries)

## Anatomy of a fibs.ts file

By default, fibs will look for a file called `fibs.ts` in the top-level project,
and recursively in imported dependencies.

The vanilla hello-world `fibs.ts` file which just defines an executable build
target looks like this:

```ts
import { Builder } from 'jsr:@floooh/fibs@^1';

export function build(b: Builder): void {
    b.addTarget({ name: "hello", type: "plain-exe", sources: ["hello.c"] });
}
```

This defines a simple executable target called `hello` which is built from a single
source file `hello.c` in the project root directory.

A more interesting `fibs.ts` file which adds support for the WASI platform looks
like this, note the new exported function `configure()` and the `addImport()` call:

```ts
import { Builder, Configurer } from 'jsr:@floooh/fibs@^1';

export function configure(c: Configurer): void {
    c.addImport({
        name: "wasisdk",
        url: "https://github.com/floooh/fibs-platforms",
        files: ["wasi.ts"],
    });
}

export function build(b: Builder): void {
    b.addTarget({ name: "hello", type: "plain-exe", sources: ["hello.c"] });
}
```

The imported file `wasi.ts` is itself a regular fibs build script which extends
fibs with new subcommands (e.g. `./fibs wasisdk install` and `./fibs wasisdk uninstall`),
new build configs like `wasi-make-debug`, and a new [Runner](./10_runners.md) which
knows how to run WASI blobs via [wasmtime](https://github.com/bytecodealliance/wasmtime).

## Configure Phase

A fibs build script may export a `configure` function which is called
to 'configure' the fibs project:

```ts
import { Configurer } from 'jsr:@floooh/fibs@^1';

export function configure(c: Configurer): void {
    // ...
}
```

The following project item types can be added in the `configure` function
by calling methods on the `Configurer` object:

- imports and import options
- commands
- build configs
- jobs
- runners
- openers
- settings keys

Most top level projects will only add imports and import options in the
configure phase, while the other project item types are commonly added in
utility/helper-type imports which add new features to fibs.

### Adding imports

The most simple way to add an import to a project is to only provide
a git url:

```ts
export function configure(c: Configurer): void {
    // import the Dear ImGui all-in-one source distribution
    c.addImport({
        name: 'imgui',
        url: 'https://github.com/floooh/dcimgui'
    });
}
```
This will clone the git repository into the `.fibs/imports` directory
at the `HEAD` commit.

If the git repository contains a `fibs.ts` file in the root directory,
fibs will automatically import that file causing a recursive import
process. For instance the above 'imgui' import adds a library target to the
top-level project:

```
> ./fibs list targets --lib
imgui: lib => /Users/floh/projects/fibs-hello-world/.fibs/imports/dcimgui
```

>[!WARNING]
>Fibs currently doesn't detect import cycles.

Imports can be pinned to a specific 'git ref' (a branch name, tag name
or commit-sha):

```ts
    c.addImport({
        name: 'imgui',
        url: 'https://github.com/floooh/dcimgui'
        // pin to Dear ImGui to version v1.92.0 via a git tag name
        ref: 'v1.92.0',
    });
```

It's also possible to selectively define a list of fibs build files to be imported.
This allows to build 'fibs collections' where a single git repository offers
multiple features. For instance the following import makes [sokol](https://github.com/floooh/sokol)
and [stb](https://github.com/nothings/stb) targets available to fibs projects:

```ts
    c.addImport({
        name: 'libs',
        url: 'https://github.com/floooh/fibs-libs',
        files: ['sokol.ts', 'stb.ts'],
    });
```

### Import options

Fibs dependencies may accept options to configure the import. The available
import options of a fibs dependency are printed when running `./fibs list imports`.

For instance the Emscripten platform support package in [https://github.com/flooh/fibs-platforms](https://github.com/floooh/fibs-platforms) has the following import options:

```
platforms: https://github.com/floooh/fibs-platforms
  emscripten.ts: emscripten platform support
    emscripten:
      initialMemory?: number - initial wasm memory in bytes (default: 32 MB)
      allowMemoryGrowth?: boolean - enable/disable wasm memory growth (default: true)
      stackSize?: number - wasm stack size in bytes (default: 512 KB)
      useEmmalloc?: boolean - enable/disable minimal emmalloc allocator (default: true)
      useFilesystem?: boolean - enable/disable emscripten filesystem layer (default: false)
      useLTO?: boolean - enable/disable LTO in release mode (default: true)
      useClosure?: boolean - enable/disable closure optimization in release mode (default: true)
      useMinimalShellFile?: boolean - use minimal shell.html file (default: true)
```

...which corresponds to the following Typescript type:

```ts
type ImportOptions = {
    initialMemory?: number;
    allowMemoryGrowth?: boolean;
    stackSize?: number;
    useEmmalloc?: boolean;
    useFilesystem?: boolean;
    useLTO?: boolean;
    useClosure?: boolean;
    useMinimalShellFile?: boolean;
};
```

Such import options can be provided via the `Configurer` method `.addImportOptions()`:

```ts
export function configure(c: Configurer): void {
    // configure Emscripten platform options
    c.addImportOptions({
        emscripten: {
            initialMemory: 8 * 1024 * 1024,
            stackSize: 64 * 1024,
            useLTO: false,
            useClosure: false,
        },
    });
    // add Emscripten platform support
    c.addImport({
        name: 'platforms',
        url: 'https://github.com/floooh/fibs-platforms',
        files: ['emscripten.ts'],
    });
}
```

The `addImportOptions()` method has an overload which allows to dynamically
build import options in a callback function based on other project properties.

This callback function is called at the start of the build phase and thus has
access to information which isn't available during the configure phase (like the
currently selected build config, or the compiler toolchain).

For instance the following code snippet checks if the current target platform
is Emscripten and in that case defines an import option for the Sokol
library to use the WebGPU backend instead of the default WebGL2 backend:

```ts
export function configure(c: Configurer): void {
    c.addImportOptions((p: Project) => {
        if (p.isEmscripten()) {
            return { sokol: { backend: 'wgpu' } };
        } else {
            return {};
        }
    });
```

Such decisions cannot be made directly in the `configure()` method, because at
the time when `configure()` runs (e.g. in the 'configure phase') the list of
build configurations isn't known yet (a typical chicken-egg situation, because
build configs are *defined* during the configure phase).

### Querying configure-phase information

The `Configurer` object passed to the `configure()` function has a couple
of getter methods which return information about the fibs runtime environment.

Use one of the following methods to get information about the host platform
the project is running on.

```ts
    // 'linux', 'macos' or 'windows'
    hostPlatform(): Platform;
    isHostPlatform(platform: Platform): boolean;
    isHostWindows(): boolean;
    isHostLinux(): boolean;
    isHostMacOS(): boolean;
```

The `hostArch()` method returns the host CPU architecture (currently only
`x86_64` and `arm64` is supported):

```ts
    // 'x86_64' or 'arm64'
    hostArch(): Arch;
```

The following helper methods return the absolute directory paths
to various fibs filesystem locations (all in the `.fibs` subdirectory):

```ts
    // [abs_proj_dir]
    projectDir(): string;
    // return import directory of this script
    selfDir(): string;
    // '[abs_proj_dir]/.fibs'
    fibsDir(): string;
    // '[abs_proj_dir]/.fibs/sdks'
    sdkDir(): string;
    // '[abs_proj_dir]/.fibs/imports'
    importsDir(): string;
    // '[abs_proj_dir]/.fibs/config/[configName]
    configDir(configName: string): string;
    // '[abs_build_dir]/.fibs/config/[configName]
    buildDir(configName: string): string;
    // '[abs_build_dir]/.fibs/config/[configName]
    distDir(configName: string): string;
```

The `selfDir()` method deserves a couple more words: in the root `fibs.ts` script
of a project the result of `selfDir()` is identical with `projectDir()`. In build
scripts which have been imported as dependencies however, `selfDir()` will return
an absolute path to the build scripts 'import directory' (e.g. for regular
imports a subdirectory in `[projdir]/.fibs/imports` or for imports that have
been linked to a local directory `selfDir()` will return this linked directory.

### More things to do in the configure phase

To add a new fibs command (which would be invoked via `./fibs mycmd`):

```ts
export function configure(c: Configurer): void {
    c.addCommand({
        name: 'mycmd',
        help: cmdHelpFunc,
        run: cmdRunFunc,
    });
}
```

More details about authoring new fibs commands can be found [here](./08_commands.md).

Similar, to register a custom build job:

```ts
export function configure(c: Configurer): void {
    c.addJob({
        name: 'mybuildjob',
        help: jobHelpFunc,
        validate: jobValidateFunc,
        build: jobBuildFunc,
    });
}
```

More details about authoring build jobs can be found [here](./09_jobs.md).

The more advanced (and less common) things to do in the `configure` function
are [adding new runners](./10_runners.md), [adding new IDE openers](./11_openers.md) and [adding new settings keys](./12_settings.md).


## Build Phase

After the configure phase the project enters the 'build phase', and this is where
compilation options and build targets are defined.

To define actions for the build phase, a fibs build script exports a
`build` function which gets a `Builder` object as argument:

```ts
import { Builder } from 'jsr:@floooh/fibs@^1';

export function build(b: Builder) {
    // ...
}
```

### Defining the project name

Call the `setProjectName()` builder method to define the project name:

```ts
    b.setProjectName('myproject');
```

The project name ends up in the cmake `project()` declaration as:

```cmake
    project(myproject C CXX)
```

### Defining cmake variables

Call the `addCmakeVariable()` builder method to add cmake variable
key/value pairs to the project. For instance this sets the C++ standard
to C++20:

```ts
    b.addCmakeVariable('CMAKE_CXX_STANDARD', '20');
```

These cmake variables directly translate to `set()` statements at the top
of the code-generated CMakeLists.txt file:

```cmake
    set(CMAKE_CXX_STANDARD 20)
```

See the [cmake documentation on cmake variables](https://cmake.org/cmake/help/latest/manual/cmake-variables.7.html) for a list of valid values.

### Including cmake snippets

Fibs project can directly include snippets of existing cmake code:

```ts
    b.addCmakeInclude('bla.cmake');
```

Relative paths will be resolved to the `selfDir()`, e.g. for top level fibs
scripts the project directory, or for imported dependencies, the import directory.

Cmake includes translate to cmake `include()` statements:

```cmake
    include([absolute_include_path])
```

### Global header and library search paths

To add one or more global header search path, call one of two `addIncludeDirectories()`
overloads. The simple version directly takes an array of strings:

```ts
    b.addInludeDirectories([ '.', 'includes' ]);
```

Likewise for global library search paths:

```ts
    b.addLinkDirectories([ `${Deno.env.get('VULKAN_SDK')}/Include` }]);
```

If relative paths are passed, they are treated relative to `selfDir()`.

The second overload allows to add options for groups of include directories,
for instance to treat the provided directories as system include directories
(e.g. silence warnings on some compilers):

```ts
    // include directories are treated like system includes
    b.addIncludeDirectories({ dirs: ['includes'], system: true });
```

In the generated cmake file this will translate to:

```cmake
    include_directories(SYSTEM "[abs_path]/includes");
```

Additionally it's possible to filter by language and build mode, for instance
the following include directory will only be added for C++ targets and
in release mode:

```ts
    b.addIncludeDirectories({
        dirs: ['cxx-release-includes'],
        language: 'cxx',
        buildMode: 'release',
    });
```

Likewise for global library search paths:

```ts
    b.addLinkDirectories({
        dirs: ['cxx-libraries'],
        language: 'cxx',
    });
```

Filtering by language and build mode needs to happen in this declarative style
because both are not known until the generated cmake script is actually
executed. In the generated cmake script, this build-time filtering will
happen via [generator expressions](https://cmake.org/cmake/help/latest/manual/cmake-generator-expressions.7.html).

For other conditions (like the compiler toolchain or the target platform)
use regular imperative code instead:

```ts
    if (b.isMsvc()) {
        // add Visual Studio specific includes
        b.addIncludeDirectories(['msvc-includes']);
    }
    if (b.isEmscripten()) {
        // add Emscripten specific includes
        b.addIncludeDirectories(['emsc-includes']);
    }
```

### Global compile definitions

To add global compile definitions call the `addCompileDefinitions()` method:
```ts
    b.addCompileDefinitions({
        MY_DEFINE: 'BLA',
        OTHER_DEFINE: '1',
    });
```
The above call will result in a cmake `add_compile_definitions()` statement:

```cmake
    add_compile_definitions(MY_DEFINE=BLA OTHER_DEFINE=1)
```

Like `addIncludeDirectories()`, the `addCompileDefinitions()` method has an
overload which allows to define filters:

```ts
    // only add MY_DEFINE for C++ code
    b.addCompileDefinitions({
        defs: { MY_DEFINE: 'BLA' },
        language: 'cxx',
    });
    // only add OTHER_DEFINE in release build mode
    b.addCompileDefinitions({
        defs: { OTHER_DEFINE: '1' },
        buildMode: 'release',
    });
```

### Global compile and link options

Global compile options are added via the `addCompileOptions()` builder method,
compile options are compiler specific, so usually compile options are defined
inside an if which checks for the compiler type:

```ts
    if (b.isMsvc()) {
        // disable a couple of MSVC warnings
        b.addCompileOptions(['/wd4244', '/wd4459']);
    }
```

It's possible to filter by language or build mode via an overload:
```ts
    if (b.isGcc() || b.isClang()) {
        // disable C++ rtti and exceptions
        b.addCompileOptions({
            opts: ['-fno-rtti', '-fno-exceptions' ],
            language: 'cxx',
        });
        // treat warnings as errors, but only in debug mode
        b.addCompileOptions({
            opts: ['-Werror'],
            buildMode: 'debug',
        });
    }
```

Link options work exactly the same but are passed to the linker command:
```ts
    if (b.isEmscripten()) {
        b.addLinkOptions(['-sSAFE_HEAP=1']);
    }
```


### Adding build targets

To add a build target, call one of two `addTarget()` overloads on the Builder
object. The fist version of `addTarget()` takes a `TargetDesc` struct as
parameter:

```ts
    b.addTarget({ name: 'hello', type: 'plain-exe', sources: ['hello.c'] });
```

The second version takes function which takes the target name, target
type and a `TargetBuilder` object as parameters:

```ts
    b.addTraget('hello', 'plain-exe', (t) => {
        t.addSources(['hello.c']);
    });
```

Which version you prefer is up to you, the `TargetBuilder` overload is usually
the better option when the target properties depend on conditions, while
the `TargetDesc` overload often makes sense for very simple targets
(like the above hello-world example).

A target has the following *required* properties:

- a **name**, this must be unique within the process and is used both to identify
  the target and to define compiler/linker output filename
- a **type**:
  - `plain-exe` a command line executable
  - `windows-exe` a UI application executable, like a macOS/iOS application bundle
    or a Windows executable with a `WinMain` entry point
  - `lib` a static link library
  - `dll` a dynamic link library
  - `interface` a 'virtual' target which is not compiled into a build artifact,
    but is only used as dependency for other targets to provide build options
- a list of relative or absolute source file paths (which for interface targets
  can actually be an empty list)

Additionally a target has the following *optional* properties:

- a subdirectory path as prefix for all other filesystem paths in the target
- an 'IDE folder' where the target sources are placed when the project
  is opened in an IDE like VStudio or Xcode
- a list other targets the target depends on
- a list of external libraries (usually system libraries) the target depends on
- a list of macOS/iOS system frameworks the target depends on
- a list of 'cmake properties' which are translated into cmake `set_target_properties` statements
- a list of header search paths (aka include directories)
- a list of library search paths (aka link directories)
- a list of compile definitions
- a list of compiler options
- a list of linker options
- a list of build jobs

#### Target filesystem path resolution

Input filesystem paths in targets can either be absolute or relative. Relative
paths are defined relative to the targets 'self-directory', e.g. the same
directory where the `fibs.ts` file defining the target resides.

For instance in the vanilla hello-world project:
```ts
    b.addTarget({
        name: 'hello',
        type: 'plain-exe',
        sources: ['hello.c']
    });
```

Assuming the hello-world project lives in filesystem location `/Users/floh/projects/fibs-hello-world`, the `hello.c` source path would resolve to:

```
/Users/floh/projects/fibs-hello-world/hello.c
```

The target definitin may contain a directory definition, if ths directory
path is relative, it is appended to the target's 'self-directory':

```ts
    b.addTarget({
        name: 'hello',
        type: 'plain-exe',
        dir: 'src',
        sources: ['hello.c'],
    });
```

In that case the hello.c source path would resolve to:
```
/Users/floh/projects/fibs-hello-world/src/hello.c
```

Source files can be referenced outside the target's self-directory
by using the directory getters on the `Builder` object (those generally
return absolute paths). This is mainly useful for creating 'non-intrusive'
build scripts for 3rd-party libraries.

For instance let's say a project imports the external `microui` UI
library like this:

```ts
export function configure(c: Configurer) {
    c.addImport({
        name: 'microui',
        url: 'https://github.com/rxi/microui',
    });
}
```

Further down in the `build()` function a target can now be declared which
points the target's directory to the import directory of the 'microui' import
(we're using the `TargetBuilder` overload of `addTarget()` here for a change):

```ts
export function build(b: Builder) {
    b.addTarget('microui', 'lib', (t) => {
        t.setDir(`${b.importDir('microui')}/src`);
        t.addSources([ 'microui.c', 'microui.h' ]);
        t.addIncludeDirectories(['.']);
    });
}
```

This is equivalent with providing the individual source files and header search paths
as absolute paths:

```ts
export function build(b: Builder) {
    const microUiDir = b.importDir('microui');
    b.addTarget('microui', 'lib', (t) => {
        t.addSources([
            `${microUiDir}/src/microui.c`,
            `${microUiDir}/src/microui.h`,
        ]);
        t.addIncludeDirectories([`${microUiDir}/src`]);
    });
}
```
...as you can see, it's much more convenient to provide the target directory
once via `t.setDir()`.

#### Target dependencies and scopes

Cmake has the concept of 'target scopes' which allows dependencies to pass
properties up the dependency chain. For instance a static link library
may define a list header search paths which need to be passed up to all
other targets which depend on this library:

```ts
    b.addTarget('microui', 'lib', (t) => {
        // ...
        t.addIncludeDirectories(['.']);
    });
```
A more explicit overload of `addIncludeDirectories()` allows more control over the
scope. For instance instance the above 'short hand' is equivalent with:

```ts
    b.addTarget('microui', 'lib', (t) => {
        // ...
        t.addIncludeDirectories({
            dirs: ['.'],
            scope: 'public',
        });
    });
```

The scope `'public'` means that the header search paths are added both to the
target itself as well to all 'upstream' targets which depend on 'microui'.

The following scopes exist:

- `'public'`: add header search paths to the target itself and all 'upstream targets'
- `'private'`: add header search paths only to the target, but not any 'upstream targets'
- `'interface'`: only add the header search paths to upstream targets, but not to the target itself

In addition to include directories, target scopes can also be defined for target compile
options, target link options and target compile definitions.


#### Filtering target properties by language and build mode

Target include directories, compile definitions, compile options and link options
can be filtered by language (`'c'` vs `cxx`') or build mode (`'release'` vs `'debug'`).

For instance to build all C code in a target as Objective-C and all C++ code as
Objective-C++:

```ts
    b.addTarget('bla', 'lib', (t) => {
        // ...
        if (b.isMacOS() || b.isIOS()) {
            t.addCompileOptions({
                opts: ['--language=objective-c++'],
                language: 'cxx',
            });
            t.addCompileOptions({
                opts: ["--language=objective-c"],
                language: 'c',
            });
        }
    });
```

...or to add different compile definitions based on `'release'` vs `'debug'` build mode:

```ts
    b.addTarget('bla', 'lib', (t) => {
        // ...
        t.addCompileDefinitions({
            defs: { IS_RELEASE_MODE: '1' },
            buildMode: 'release',
        });
        t.addCompileDefinitions({
            defs: { IS_DEBUG_MODE: '1' },
            buildMode: 'debug',
        });
    });
```

#### Adding target build jobs

Targets can depend on build jobs for code generation or invoking external build
tools.

For instance the [fibs-utils](https://github.com/floooh/fibs-utils) offers
build jobs for embedding binary data into C headers, copying asset files
into the target distribution directory, or invoking the sokol-shdc shader
compile:

```ts
export function configure(c: Configurer) {
    // get the fibs-utils build jobs for embedding binary files into
    // C headers, copying asset files and invoking the sokol shader compiler
    c.addImport({
        name: 'utils',
        url: 'https://github.com/floooh/fibs-utils',
        files: ['embedfiles.ts', 'copyfiles.ts', 'sokolshdc.ts'],
    });
    // ...
};
```

...then to attach those jobs to targets in the build phase:

```ts
export function build(b: Builder) {
    b.addTarget('bla', 'exe', (t) => {
        // ...
        // embed CPC floppy disk images into a C header
        t.addJob({
            job: 'embedfiles',
            args: {
                outHeader: 'disk-images.h',
                files: [
                    'boulderdash_cpc.dsk',
                    'dtc_cpc.dsk',
                ]
            }
        })
    });
}
```

...likewise for copying asset files into the target's 'dist directory'
(e.g. where the target exe is places after compilation):

```ts
    b.addTarget('bla', 'exe', (t) => {
        t.addJob({
            job: 'copyfiles',
            args: {
                srcDir: `${b.projectDir}/assets`,
                files ['baboon.jpg'],
            }
        });
    });
```

...or for invoking the sokol-shdc shader compiler:

```ts
    b.addTarget('bla', 'exe', (t) => {
        // NOTE: place the generated C header into the intermediate build directory
        const shdcOutDir = t.buildDir();
        t.addSources(['demo.c', 'demo.glsl' ]);
        t.addJob({
            job: 'sokolshdc',
            args: {
                src: 'demo.glsl',
                outDir: shdcOutDir,
            }
        });
        // demo.c needs to find the generated C header
        t.addIncludeDirectories([ shdcOutDir ]);
    });
```

### Querying build-phase information
[TODO]

## 'Fibsifying' existing libraries
[TODO]
