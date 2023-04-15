import { ConfigDesc } from '../types.ts';

export const configs: ConfigDesc[] = [
    {
        name: 'win-vstudio',
        ignore: true,
        platform: 'windows',
        arch: 'x86_64',
        opener: 'vstudio',
    },
    {
        name: 'win-vstudio-release',
        inherits: 'win-vstudio',
        buildType: 'release',
    },
    {
        name: 'win-vstudio-debug',
        inherits: 'win-vstudio',
        buildType: 'debug',
    },
    {
        name: 'macos-make',
        ignore: true,
        platform: 'macos',
        generator: 'Unix Makefiles',
    },
    {
        name: 'macos-ninja',
        ignore: true,
        platform: 'macos',
        generator: 'Ninja',
    },
    {
        name: 'macos-xcode',
        ignore: true,
        platform: 'macos',
        generator: 'Xcode',
        opener: 'xcode',
    },
    {
        name: 'macos-vscode',
        ignore: true,
        platform: 'macos',
        generator: 'Ninja',
        opener: 'vscode',
    },
    {
        name: 'macos-make-release',
        inherits: 'macos-make',
        buildType: 'release',
    },
    {
        name: 'macos-make-debug',
        inherits: 'macos-make',
        buildType: 'debug',
    },
    {
        name: 'macos-ninja-release',
        inherits: 'macos-ninja',
        buildType: 'release',
    },
    {
        name: 'macos-ninja-debug',
        inherits: 'macos-ninja',
        buildType: 'debug',
    },
    {
        name: 'macos-xcode-release',
        inherits: 'macos-xcode',
        buildType: 'release',
    },
    {
        name: 'macos-xcode-debug',
        inherits: 'macos-xcode',
        buildType: 'debug',
    },
    {
        name: 'macos-vscode-release',
        inherits: 'macos-vscode',
        buildType: 'release',
    },
    {
        name: 'macos-vscode-debug',
        inherits: 'macos-vscode',
        buildType: 'debug',
    },
    {
        name: 'linux-make',
        ignore: true,
        platform: 'linux',
        generator: 'Unix Makefiles',
    },
    {
        name: 'linux-ninja',
        ignore: true,
        platform: 'linux',
        generator: 'Ninja',
    },
    {
        name: 'linux-make-release',
        inherits: 'linux-make',
        buildType: 'release',
    },
    {
        name: 'linux-make-debug',
        inherits: 'linux-make',
        buildType: 'debug',
    },
    {
        name: 'linux-ninja-release',
        inherits: 'linux-ninja',
        buildType: 'release',
    },
    {
        name: 'linux-ninja-debug',
        inherits: 'linux-ninja',
        buildType: 'debug',
    },
    {
        name: 'emsc',
        ignore: true,
        platform: 'emscripten',
        runner: 'emscripten',
        toolchainFile: '@sdks:emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake',
    },
    {
        name: 'emsc-make',
        ignore: true,
        inherits: 'emsc',
        generator: 'Unix Makefiles',
    },
    {
        name: 'emsc-ninja',
        ignore: true,
        inherits: 'emsc',
        generator: 'Ninja',
    },
    {
        name: 'emsc-vscode',
        ignore: true,
        inherits: 'emsc-ninja',
        opener: 'vscode',
    },
    {
        name: 'emsc-make-debug',
        inherits: 'emsc-make',
        buildType: 'debug',
    },
    {
        name: 'emsc-make-release',
        inherits: 'emsc-make',
        buildType: 'release',
    },
    {
        name: 'emsc-ninja-debug',
        inherits: 'emsc-ninja',
        buildType: 'debug',
    },
    {
        name: 'emsc-ninja-release',
        inherits: 'emsc-ninja',
        buildType: 'release',
    },
    {
        name: 'emsc-vscode-debug',
        inherits: 'emsc-vscode',
        buildType: 'debug',
    },
    {
        name: 'emsc-vscode-release',
        inherits: 'emsc-vscode',
        buildType: 'release',
    },
    {
        name: 'wasi',
        ignore: true,
        platform: 'wasi',
        runner: 'wasi',
        toolchainFile: '@sdks:wasisdk/share/cmake/wasi-sdk.cmake',
        cmakeVariables: {
            WASI_SDK_PREFIX: '@sdks:wasisdk',
        },
    },
    {
        name: 'wasi-make',
        ignore: true,
        inherits: 'wasi',
        generator: 'Unix Makefiles',
    },
    {
        name: 'wasi-make-debug',
        inherits: 'wasi-make',
        buildType: 'debug',
    },
    {
        name: 'wasi-make-release',
        inherits: 'wasi-make',
        buildType: 'release',
    },
    {
        name: 'wasi-ninja',
        ignore: true,
        inherits: 'wasi',
        generator: 'Ninja',
    },
    {
        name: 'wasi-ninja-debug',
        inherits: 'wasi-ninja',
        buildType: 'debug',
    },
    {
        name: 'wasi-ninja-release',
        inherits: 'wasi-ninja',
        buildType: 'release',
    },
]
