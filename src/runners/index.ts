import { nativeRunner } from './native.ts';
import { wasiRunner } from './wasi.ts';

export const runners = [
    nativeRunner,
    wasiRunner,
];
