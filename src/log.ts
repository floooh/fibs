import { colors } from '../deps.ts';

const textEncoder = new TextEncoder();

export function print(...args: unknown[]) {
    console.log(...args);
}

export function dir(item: any) {
    console.dir(item, { colors: true, depth: 8 });
}

export function help(cmds: string[], help: string | string[]) {
    for (const cmd of cmds) {
        print(`${colors.yellow(`fibs ${cmd}`)}`);
    }

    if (typeof help === 'string') {
        help = [help];
    }
    help.forEach((line) => {
        print('    ', line);
    });
    print('');
}

export function run(cmdLine: string[]) {
    print(colors.cyan(`=> ${cmdLine.join(' ')}`));
}

export function section(name: string) {
    print(colors.yellow(`=== ${name}:`));
}

export function write(str: string) {
    Deno.stdout.writeSync(textEncoder.encode(str));
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

export function ask(msg: string, yes: boolean): boolean {
    if (yes) {
        return true;
    } else {
        return confirm(`${colors.bold(colors.brightRed('??'))} ${msg}?`);
    }
}
