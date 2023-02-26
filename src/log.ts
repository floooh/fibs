import { colors } from '../deps.ts';

export function print(...args: unknown[]) {
    console.log(...args);
}

export function help(cmds: string[], help: string) {
    for (const cmd of cmds) {
        print(`${colors.yellow(`fibs ${cmd}`)}`);
    }
    print('    ', help, '\n');
}

export function info(...args: unknown[]) {
    console.info(...args);
}

export function warn(...args: unknown[]) {
    console.warn(`${colors.yellow('[warning]')}`, ...args);
}

export function error(...args: unknown[]): never {
    console.warn(`${colors.red('[error]')}`, ...args);
    Deno.exit(10);
}
