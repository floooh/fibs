# Writing Build Scripts
[⇦ back](./index.md)

- [Anatomy of a fibs.ts file](#anatomy-of-a-fibsts-file)
- [Configure Phase](#configure-phase)
  - [Adding imports](#adding-imports)
  - [Import options](#import-options)
  - [Querying configure-phase information](#querying-configure-phase-information)
  - [More things to do in the configure phase](#more-things-to-do-in-the-configure-phase)
- [Build Phase](#build-phase)
  - [Global build options](#global-build-options)
  - [Adding targets](#adding-targets)
  - [Target dependencies and scopes](#target-dependencies-and-scopes)
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

Most top level projects will only add imports and import options, while
the other project item types are commonly added in utility/helper-type
imports which add new features to fibs.

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
[TODO]

### Querying configure-phase information
[TODO]

### More things to do in the configure phase
[TODO]

## Build Phase
[TODO]

### Global build options
[TODO]

- include directories
- compile definitions
- compile options
- link options

### Adding targets
[TODO]

### Target dependencies and scopes

[TODO]

### Adding target build jobs
[TODO]

### Querying build-phase information
[TODO]

## 'Fibsifying' existing libraries
[TODO]
