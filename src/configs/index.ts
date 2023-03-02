import { ConfigDesc } from '../types.ts';

export const configs: Record<string, ConfigDesc> = {
    'win-vstudio': {
        ignore: true,
        platform: 'windows',
        arch: 'x86_64',
    },
    'win-vstudio-release': {
        inherits: 'win-vstudio',
        buildType: 'release',
    },
    'win-vstudio-debug': {
        inherits: 'win-vstudio',
        buildType: 'debug',
    },
    'macos-make': {
        ignore: true,
        platform: 'macos',
        generator: 'Unix Makefiles',
    },
    'macos-make-release': {
        inherits: 'macos-make',
        buildType: 'release',
    },
    'macos-make-debug': {
        inherits: 'macos-make',
        buildType: 'debug',
    },
    'linux-make': {
        ignore: true,
        platform: 'linux',
        generator: 'Unix Makefiles',
    },
    'linux-make-release': {
        inherits: 'linux-make',
        buildType: 'release',
    },
    'linux-make-debug': {
        inherits: 'linux-make',
        buildType: 'debug',
    },
};
