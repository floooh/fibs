# Troubleshooting

In case of problems, try the following things in order:

## Clean the Deno package cache

Run `deno clean`, this will clean the global Deno package cache and download
a new version of `fibs` on the next run. `fibs` currently doesn't have a strict
semantic versioning update philosophy, e.g. breaking changes may happen without
bumping the major version.

```bash
deno clean
```

## Delete the .fibs directory via `./fibs reset`

If clearing the Deno package cache doesn't fix the issue, try running
`./fibs reset` next. This will delete the local `.fibs/` subdirectory
and clone the dependencies. This may fix issues when dependencies have
been updated but the project doesn't pin dependencies to a specific
git commit.

```bash
./fibs reset
```

## Run `./fibs diag tools` to check for missing cmdline tools

Imported dependencies may add fibs features which depend on the presence
of specific command line tools. To make sure that all required command line
tools are found, run `./fibs diag tools`:

```bash
./fibs diag tools
git:    found
cmake:  found
ninja:  found
make:   found
vscode: found
vscode-cpptools:        found
vscode-cmaketools:      found
vscode-wasmdwarf:       found
http-server:    found
tar:    found
wasmtime:       OPTIONAL, NOT FOUND (required for running wasi executables)
```

## Run with `--verbose` for additional debug output

Many fibs commands print additional information when started with verbose:

```bash
> ./fibs config macos-ninja-release --verbose
=> cmake --preset macos-ninja-release -B /Users/floh/projects/fibs-hello-world/.fibs/build/macos-ninja-release
-- Configuring done (0.1s)
-- Generating done (0.0s)
-- Build files have been written to: /Users/floh/projects/fibs-hello-world/.fibs/build/macos-ninja-release
> _
```
