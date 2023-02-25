import { Platform } from './types.ts';

export function platform(): Platform {
  switch (Deno.build.os) {
    case 'darwin': return Platform.macos;
    case 'windows': return Platform.windows;
    default: return Platform.linux;
  }
}
