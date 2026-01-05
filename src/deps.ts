// NOTE: we intentionally don't use deno.json import maps because
// they don't work when importing fibs/index.ts directly via the filesystem
export * as path from 'jsr:@std/path@^1';
export * as fs from 'jsr:@std/fs@^1';
export * as colors from 'jsr:@std/fmt@^1/colors';
