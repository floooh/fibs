import { main, log, Configurer, Builder } from './index.ts';
if (import.meta.main) main();

// FIXME: remove those
export function configure(_c: Configurer): void {
    log.info('configure() called!');
}

export function build(_b: Builder): void {
    log.info('build() called!');
}
