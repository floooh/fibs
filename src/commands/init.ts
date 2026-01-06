import { host, log, util } from '../lib/index.ts';
import type { CommandDesc } from '../types.ts';
import { colors, path } from '../deps.ts';

export const initCmd: CommandDesc = { name: 'init', help, run };

function help() {
    log.helpCmd(['init'], [
        'init current dir as fibs project',
        `run as 'deno run --allow-all jsr:@floooh/fibs init'`,
    ]);
}

export async function run(): Promise<void> {
    if (!log.ask('ok to initialize current directory as fibs project', false)) {
        return;
    }
    safeWrite('.gitignore', gitIgnoreContent);
    safeWrite('fibs', fibsContent);
    safeWrite('fibs.cmd', fibsCmdContent);
    safeWrite('fibs.ts', fibsTsContent);
    safeWrite('src/hello.c', helloContent);
    if (host.platform() === 'windows') {
        log.info(`\n${colors.brightBlue('[note]')} cannot set executable flag on file 'fibs' since we're on Windows!`);
    } else {
        Deno.chmod('fibs', 0o755);
    }
    log.info(`\nNext run './fibs build' and './fibs run hello'\n`);
}

function safeWrite(relPath: string, content: string) {
    if (util.fileExists(relPath)) {
        if (!log.ask(`Overwrite ${relPath}?`, false)) {
            log.info(`${colors.yellow('skipping')} ${relPath}`);
            return;
        }
    }
    util.ensureDir(path.dirname(relPath));
    Deno.writeTextFileSync(relPath, content);
    log.info(`${colors.green('wrote')} ${relPath}`);
}

const gitIgnoreContent = `
.fibs/
.vscode/
CMakeLists.txt
CMakePresets.json
`;

const fibsContent = `
#!/bin/sh
exec deno run --allow-all --no-config 'jsr:@floooh/fibs' "$@"
`;

const fibsCmdContent = `
@deno run --allow-all --no-config jsr:@floooh/fibs %*
`;

const fibsTsContent = `
import { Builder, Configurer } from 'jsr:@floooh/fibs@^1';

export function build(b: Builder): void {
    b.addTarget({
        name: "hello",
        type: "plain-exe",
        dir: "src",
        sources: ["hello.c"]
    });
}
`;

const helloContent = `
#include <stdio.h>

int main() {
    printf("Hello World!\\n");
    return 0;
}
`;
