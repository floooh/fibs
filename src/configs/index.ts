import { ConfigDesc } from '../types.ts';

export const configs: Record<string, ConfigDesc> = {
    'win-vstudio': {
        ignore: true,
        platform: 'windows',
        arch: 'x86_64',
        opener: 'vstudio',
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
    'macos-xcode': {
        ignore: true,
        platform: 'macos',
        generator: 'Xcode',
        opener: 'xcode',
    },
    'macos-vscode': {
        ignore: true,
        platform: 'macos',
        generator: 'Ninja',
        opener: 'vscode',
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
    'macos-xcode-release': {
        inherits: 'macos-xcode',
        buildType: 'release',
    },
    'macos-xcode-debug': {
        inherits: 'macos-xcode',
        buildType: 'debug',
    },
    'macos-vscode-release': {
        inherits: 'macos-vscode',
        buildType: 'release',
    },
    'macos-vscode-debug': {
        inherits: 'macos-vscode',
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
    'emsc': {
        ignore: true,
        platform: 'emscripten',
        runner: 'emscripten',
        toolchainFile: '@sdks/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake',
    },
    'emsc-make': {
        ignore: true,
        inherits: 'emsc',
        generator: 'Unix Makefiles',
    },
    'emsc-make-debug': {
        inherits: 'emsc-make',
        buildType: 'debug',
    },
    'emsc-make-release': {
        inherits: 'emsc-make',
        buildType: 'release',
    },
    'emsc-ninja': {
        ignore: true,
        inherits: 'emsc',
        generator: 'Ninja',
    },
    'emsc-ninja-debug': {
        inherits: 'emsc-ninja',
        buildType: 'debug',
    },
    'emsc-ninja-release': {
        inherits: 'emsc-ninja',
        buildType: 'release',
    },
    'wasi': {
        ignore: true,
        platform: 'wasi',
        runner: 'wasi',
        toolchainFile: '@sdks/wasisdk/share/cmake/wasi-sdk.cmake',
        variables: {
            WASI_SDK_PREFIX: '@sdks/wasisdk',
        },
    },
    'wasi-make': {
        ignore: true,
        inherits: 'wasi',
        generator: 'Unix Makefiles',
    },
    'wasi-make-debug': {
        inherits: 'wasi-make',
        buildType: 'debug',
    },
    'wasi-make-release': {
        inherits: 'wasi-make',
        buildType: 'release',
    },
    'wasi-ninja': {
        ignore: true,
        inherits: 'wasi',
        generator: 'Ninja',
    },
    'wasi-ninja-debug': {
        inherits: 'wasi-ninja',
        buildType: 'debug',
    },
    'wasi-ninja-release': {
        inherits: 'wasi-ninja',
        buildType: 'release',
    },
};
