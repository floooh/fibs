# Creating Custom Build Jobs
[⇦ back](./index.md)

Build jobs generate files during the build, for instance C headers from
shader sources, or copy asset files next to executables. Jobs are registered
in a `configure()` function and are then attached to targets in a `build()`
function:

```ts
t.addJob({ job: 'copyfiles', args: { srcDir: 'assets', files: ['baboon.png'] } });
```

Each job instance becomes its own build rule in the generated `CMakeLists.txt`,
so the build system decides when a job needs to run (when an output is missing
or older than an input), and independent jobs run in parallel.

A job is registered with `c.addJob()`:

- `name`: the job name used in `t.addJob()`
- `help()`: prints help text (used by `fibs list jobs`)
- `validate(args)`: validates the job args passed to `t.addJob()`
- `build(project, config, target, args)`: returns a `Job` object which
  describes a single job instance
- `run(inputs, outputs, args)`: optional, implements script jobs (see below)

The returned `Job` object has the following properties:

- `name`: the job name
- `inputs`: input files, the job runs when an input is newer than an output
- `outputs`: output files produced by the job
- `addOutputsToTargetSources`: if true, the outputs are added to the target's
  source files (e.g. for generated C headers)
- `commands`: for command jobs, a list of command lines
- `args`: for script jobs, JSON-serializable args passed to `run()`

Relative paths in inputs, outputs and command lines are relative to the
target directory, and output directories are created automatically.

## Command jobs

Command jobs run one or more command lines. This is the preferred job type
since it doesn't need deno at build time:

```ts
function build(p: Project, c: Config, t: Target, args: unknown): Job {
    const { files } = args as { files: string[] };
    const dstDir = p.targetAssetsDir(t.name, c.name);
    const inputs = files.map((file) => `${t.dir}/${file}`);
    const outputs = files.map((file) => `${dstDir}/${file}`);
    return {
        name: 'copyfiles',
        inputs,
        outputs,
        addOutputsToTargetSources: false,
        commands: inputs.map((input, i) => ['cmake', '-E', 'copy_if_different', input, outputs[i]]),
    };
}
```

A command line which starts with `cmake` runs the same cmake executable which
drives the build, so `cmake -E ...` commands are a portable way to do simple
file operations.

### Running executables built by the project

Instead of a string, a command line item can also reference an executable
target of the project via `{ target: 'name' }`. This is replaced with the path
of the target's executable, and the job runs after the target has been built
(and runs again when the executable changes):

```ts
commands: [[{ target: 'my-code-generator' }, '--output', outputs[0]]],
```

This only works when the build config platform matches the host platform
(e.g. not when cross-compiling for Emscripten, Android or iOS).

## Script jobs

Script jobs are implemented in Typescript. A job without commands must have a
`run()` function, which runs at build time in a separate deno process:

```ts
export function configure(c: Configurer) {
    c.addJob({ name: 'myjob', help, validate, build, run });
}

function build(p: Project, c: Config, t: Target, args: unknown): Job {
    return {
        name: 'myjob',
        inputs: ['data.txt'],
        outputs: [`${p.targetBuildDir(t.name, c.name)}/data.h`],
        addOutputsToTargetSources: true,
        args: { prefix: 'data_' },
    };
}

async function run(inputs: string[], outputs: string[], args: { prefix: string }) {
    const text = await Deno.readTextFile(inputs[0]);
    await Deno.writeTextFile(outputs[0], `static const char* ${args.prefix}text = ${JSON.stringify(text)};\n`);
}
```

Since `run()` is called in a separate process, it must only depend on its
arguments: all information from the Project or Config objects must be
resolved in `build()` and passed via `args`.

## Job dependencies

A job may use the output of another job as input (also across targets), the
build system then runs the jobs in the right order. Identical jobs in
different targets (same job, inputs, outputs and args) are merged into a
single build rule.

When generating the build files, fibs checks that:

- each job input either exists or is the output of another job
- different jobs don't produce the same output file
- there are no cyclic dependencies between jobs

Some targets have their own asset directory (e.g. windowed executables on
macOS and iOS which live in an app bundle), while on other platforms all
targets share the same `dist` directory. fibs simulates the shared layout and
warns about jobs which would produce the same output on other platforms.
