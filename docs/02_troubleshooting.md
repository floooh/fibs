# Troubleshooting

(FIXME)

In case of problems, try the following in order:

1. run `deno clean`, this will clear the Deno package cache and cause the fibs package to updated on next run
2. run `./fibs reset` in the project directory, this will delete the `.fibs` subdirectory and cause all dependencies to be updated
3. run `./fibs diag tools` in the project directory, this will check if required command line tools exist