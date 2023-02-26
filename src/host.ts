import { Platform } from './types.ts';

export function platform(): Platform {
    switch (Deno.build.os) {
        case 'darwin':
            return Platform.Macos;
        case 'windows':
            return Platform.Windows;
        default:
            return Platform.Linux;
    }
}
