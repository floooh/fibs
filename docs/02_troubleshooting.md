# Troubleshooting

In case of problems, try the following things in order:

- [Clean the Deno package cache](#clean-the-deno-package-cache)
- [Run `./fibs update` to update dependencies](#run-fibs-update-to-update-dependencies)
- [Delete the .fibs directory via `./fibs reset`](#delete-the-fibs-directory-via-fibs-reset)
- [Run `./fibs diag tools` to check for missing cmdline tools](#run-fibs-diag-tools-to-check-for-missing-cmdline-tools)
- [Run with `--verbose` for additional debug output](#run-with---verbose-for-additional-debug-output)

## Clean the Deno package cache

Run `deno clean`, this will clean the global Deno package cache and download
a new version of `fibs` on the next run. `fibs` currently doesn't have a strict
semantic versioning update philosophy, e.g. breaking changes may happen without
bumping the major version.

```bash
deno clean
```

## Run `./fibs update` to update dependencies

Compile errors may be caused by dependencies not being uptodate (e.g.
for dependencies which are not pinned to a specific commit-sha). In that
case try:

```bash
./fibs update
```

## Delete the .fibs directory via `./fibs reset`

Sometimes it may be necessary to start from scratch by deleting
the `.fibs/` subdirectory. Do this by running:

```bash
./fibs reset
```

After a prompt this will delete the `.fibs/` subdirectory and then
immediately fetch any dependencies.

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
