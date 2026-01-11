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
[TODO]

### Adding imports
[TODO]

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
