# Working with Imports

NOTES:

- writing import scripts versus top-level fibs.ts scripts
- import options
- examples
- 'bundle imports' (e.g. multiple .ts files in the same import)
- 'fibsification'


## Import order and overrides

An important fibs concept is that dependencies 'closer' to the root project
can override items added by dependencies that are further away from the
build root.

This is mostly useful for changing the behaviour of imported dependencies in
the root project. For instance the root directory might want to redirect an
import further down in the dependency to a fork. This can simply be achieved
by defining an import of the same name in the root project's `fibs.ts` file
which points to another git url.

This 'controlled override by name' is not limited to imports but works
for all items in the `Project` registry and also works for builtin items like
standard build configs and even builtin fibs commands (with the exception of
the special commands `./fibs reset` and `./fibs init`).
