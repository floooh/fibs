export function info(...args: unknown[]) {
  console.info(...args);
}

export function warn(...args: unknown[]) {
  console.warn("%c[warning] ", "color:yellow", ...args);
}

export function error(...args: unknown[]) {
  console.error("%c[Error] ", "color:red", ...args);
  Deno.exit(10);
}
