import { Configurer } from '../types.ts';
import { nativeRunner } from './native.ts';

export function addDefaultRunners(c: Configurer): void {
    c.addRunner(nativeRunner);
}
