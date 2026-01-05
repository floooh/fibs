import type { Schema } from '../types.ts';
import { colors } from '../deps.ts';

const textEncoder = new TextEncoder();
let _verbose = false;

export function setVerbose(v: boolean) {
    _verbose = v;
}

export function verbose(): boolean {
    return _verbose;
}

export function print(...args: unknown[]) {
    console.log(...args);
}

export function dir(item: unknown) {
    console.dir(item, { colors: true, depth: 8 });
}

export function helpCmd(cmds: string[], help: string | string[]) {
    for (const cmd of cmds) {
        print(`${colors.yellow(`fibs ${cmd}`)}`);
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
    print(`${colors.green(`${name}:`)} ${help}`);
    for (const [key, val] of Object.entries(schema)) {
        print(`  ${colors.brightBlue(`${key}${val.optional ? '?' : ''}:`)} ${colors.yellow(val.type)} - ${val.desc}`);
    }
    print('');
}

export function helpImport(name: string, help: string, importOptions: { name: string; schema: Schema }[]) {
    print(`  ${colors.cyan(name)}: ${help}`);
    if (importOptions.length > 0) {
        for (const opts of importOptions) {
            print(`    ${colors.brightBlue(`${opts.name}:`)}`);
            for (const [key, val] of Object.entries(opts.schema)) {
                print(`      ${colors.brightBlue(`${key}${val.optional ? '?' : ''}:`)} ${colors.yellow(val.type)} - ${val.desc}`);
            }
        }
    }
    print('');
}

export function run(cmdLine: string[], cwd?: string) {
    const cwdString = cwd ? `(in ${cwd})` : '';
    print(colors.brightBlue(`=> ${cmdLine.join(' ')} ${cwdString}`));
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

export function error(err: unknown): never {
    // FIXME: only print message by default, and more detailed
    // output only on verbose
    if (err instanceof Error) {
        if (_verbose) {
            // complete error with stack trace
            console.warn(`\n${colors.red('[error]')} `, err, `\n`);
        } else {
            console.warn(`\n${colors.red('[error]')} ${err.message}\n`);
        }
        if (err.cause !== undefined) {
            console.warn(`${colors.brightBlue('[cause]')} `, err.cause, '\n\n');
        }
    } else {
        console.warn(`${colors.red('[unknown error]')}: `, err, '\n');
    }
    Deno.exit(10);
}

export function ask(msg: string, yes: boolean): boolean {
    if (yes) {
        return true;
    } else {
        return confirm(`${colors.bold(colors.brightRed('??'))} ${msg}?`);
    }
}
