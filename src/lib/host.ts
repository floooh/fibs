import { Arch } from '../types.ts';

export function platform(): 'macos' | 'windows' | 'linux' {
    switch (Deno.build.os) {
        case 'darwin':
            return 'macos';
        case 'windows':
            return 'windows';
        default:
            return 'linux';
    }
}

export function arch(): Arch {
    switch (Deno.build.arch) {
        case 'x86_64':
            return 'x86_64';
        case 'aarch64':
            return 'arm64';
    }
}

export function defaultConfig(): string {
    switch (platform()) {
        case 'macos':
            return 'macos-make-release';
        case 'windows':
            return 'win-vstudio-release';
        case 'linux':
            return 'linux-make-release';
    }
}
