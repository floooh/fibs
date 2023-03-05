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
    'macos-ninja': {
        ignore: true,
        platform: 'macos',
        generator: 'Ninja',
    },
    'macos-make-release': {
        inherits: 'macos-make',
        buildType: 'release',
    },
    'macos-make-debug': {
        inherits: 'macos-make',
        buildType: 'debug',
    },
    'macos-ninja-release': {
        inherits: 'macos-ninja',
        buildType: 'release',
    },
    'macos-ninja-debug': {
        inherits: 'macos-ninja',
        buildType: 'debug',
    },
    'linux-make': {
        ignore: true,
        platform: 'linux',
        generator: 'Unix Makefiles',
    },
    'linux-ninja': {
        ignore: true,
        platform: 'linux',
        generator: 'Ninja',
    },
    'linux-make-release': {
        inherits: 'linux-make',
        buildType: 'release',
    },
    'linux-make-debug': {
        inherits: 'linux-make',
        buildType: 'debug',
    },
    'linux-ninja-release': {
        inherits: 'linux-ninja',
        buildType: 'release',
    },
    'linux-ninja-debug': {
        inherits: 'linux-ninja',
        buildType: 'debug',
    },
};
