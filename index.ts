import { main } from './src/main.ts';
export * from './src/types.ts';
export * from './src/lib/index.ts';

if (import.meta.main) {
    await main();
}