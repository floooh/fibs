import type { Schema } from '../types.ts';
import { bold, brightBlue, brightRed, green, red, yellow } from '@std/fmt/colors';

const textEncoder = new TextEncoder();

export function print(...args: unknown[]) {
    console.log(...args);
}

export function dir(item: unknown) {
    console.dir(item, { colors: true, depth: 8 });
}

export function helpCmd(cmds: string[], help: string | string[]) {
    for (const cmd of cmds) {
        print(`${yellow(`fibs ${cmd}`)}`);
    }
    if (typeof help === 'string') {
        print('    ', help);
    } else {
        for (const line of help) {
            print('    ', line);
        }
    }
    print('');
}

export function helpJob(name: string, help: string, schema: Schema) {
    print(`${green(`${name}:`)} ${help}`);
    for (const [key, val] of Object.entries(schema)) {
        print(`  ${brightBlue(`${key}${val.optional ? '?' : ''}:`)} ${yellow(val.type)} - ${val.desc}`);
    }
    print('');
}

export function helpImport(name: string, help: string, importOptions: { name: string; schema: Schema }[]) {
    print(`  ${green(name)}: ${help}`);
    if (importOptions.length > 0) {
        for (const opts of importOptions) {
            print(`    ${brightBlue(`${opts.name}:`)}`);
            for (const [key, val] of Object.entries(opts.schema)) {
                print(`      ${brightBlue(`${key}${val.optional ? '?' : ''}:`)} ${yellow(val.type)} - ${val.desc}`);
            }
        }
    }
    print('');
}

export function run(cmdLine: string[], cwd?: string) {
    const cwdString = cwd ? `(in ${cwd})` : '';
    print(brightBlue(`=> ${cmdLine.join(' ')} ${cwdString}`));
}

export function section(name: string) {
    print(yellow(`=== ${name}:`));
}

export function write(str: string) {
    Deno.stdout.writeSync(textEncoder.encode(str));
}

export function info(...args: unknown[]) {
    console.info(...args);
}

export function warn(...args: unknown[]) {
    console.warn(`${yellow('[warning]')}`, ...args);
}

export function panic(...args: unknown[]): never {
    console.warn(`${red('[error]')}`, ...args);
    console.trace();
    Deno.exit(10);
}

export function ask(msg: string, yes: boolean): boolean {
    if (yes) {
        return true;
    } else {
        return confirm(`${bold(brightRed('??'))} ${msg}?`);
    }
}
