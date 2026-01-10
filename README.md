# fibs

*Floh's Infernal Build System*

A Typescript-based cmake-wrapper and task-runner that simplifies C/C++ project configuration and builds (sprititual successor to [fips](https://github.com/floooh/fips)).

[Getting Started](./docs/01_getting_started.md) • [Troubleshooting](./docs/02_troubleshooting.md) • [Usage](./docs/03_usage.md) • [Documentation](./docs/index.md)

**TL;DR**: Write your build scripts in Typescript:
```ts
import { Builder } from 'jsr:@floooh/fibs@^1';

export function build(b: Builder) {
    b.addTarget({
        name: "hello",
        type: "plain-exe",
        sources: ["hello.c"]
    });
}
```

...then build and run:
```bash
./fibs build
./fibs run hello
```

...plus [much more](./docs/03_usage.md).

## Features

- describe C/C++ builds in Typescript instead of wrestling with cmake syntax
- runs on macOS, Linux and Windows
- import dependencies from git repositories
- extensibility as core feature:
  - add subcommands for custom workflows and automation
  - custom build jobs for code generation or invoking external build tools (shader compilers, asset exporters, etc...)
  - add new target platforms and IDE integrations
  - ...all written in Typescript/Deno

## Differences to Fips

- everything is Typescript instead of a mix of Python, YAML and cmake-script
- dependencies and output files are now stored within the project directory instead of 'sister directories'
- new target platforms (e.g. WASI, Emscripten) and IDE integrations can now be added in regular dependencies instead of submitting PRs to the core project
- non-intrusive 'fibsification' of 3rd-party no longer requires wrestling with git submodules