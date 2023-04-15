import { nativeRunner } from './native.ts';
import { wasiRunner } from './wasi.ts';
import { emscriptenRunner } from './emscripten.ts';

export const runners = [
    nativeRunner,
    wasiRunner,
    emscriptenRunner,
];
