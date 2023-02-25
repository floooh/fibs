import { Platform } from './types.ts';

export function platform(): Platform {
  switch (Deno.build.os) {
    case 'darwin': return Platform.macos;
    case 'linux': return Platform.linux;
    case 'windows': return Platform.windows;
  }
}
