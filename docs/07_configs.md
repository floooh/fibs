# Adding Build Configs
[⇦ back](./index.md)

TODO:

- composing build configs via Typescript features
- examples (Emscripten, WASI)

## Compiler hints

Build scripts can query the compiler (e.g. `b.isMsvc()` or `b.isClang()`)
before cmake runs, so fibs needs to identify the compiler of a build config
upfront. This happens in the following order:

- if the config defines a `compiler` hint (`'msvc'`, `'gcc'`, `'clang'` or
  `'appleclang'`), this is used directly (except when the `CC` environment
  variable is set for a host compiler)
- for host compilers (no toolchain file, no `CMAKE_C_COMPILER` or
  `CMAKE_TOOLCHAIN_FILE` cmake cache variable and no Visual Studio generator),
  fibs runs `$CC` (or `cc`) to print its predefined macros, the result is
  cached in `.fibs/config/[config]/compiler.json`
- otherwise fibs runs cmake on a dummy project to identify the compiler, the
  result is cached in `.fibs/config/[config]/cmake_config.json`

The last option is slow because it runs cmake's complete compiler detection,
so configs which use a toolchain file or the Visual Studio generator should
define a compiler hint:

```ts
c.addConfig({
    name: 'emsc-ninja-release',
    platform: 'emscripten',
    buildMode: 'release',
    compiler: 'clang',
    toolchainFile: '...',
    // ...
});
```

The builtin Windows and macOS configs already define a compiler hint. Since
the compiler hint takes precedence over a toolchain file, configs which are
derived from a builtin config and select a different compiler (e.g. via a
toolchain file) must also override the compiler hint.
