import { ConfigDesc } from '../types.ts';

export const configs: ConfigDesc[] = [
    {
        name: 'win',
        ignore: true,
        platform: 'windows',
        arch: 'x86_64',
        validate: () => ({ valid: true, hints: [] }),
    },
    {
        name: 'win-vstudio',
        inherits: 'win',
        ignore: true,
        opener: 'vstudio',
        compilers: ['msvc'],
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
        name: 'macos',
        ignore: true,
        platform: 'macos',
        compilers: ['appleclang'],
        validate: () => ({ valid: true, hints: [] }),
    },
    {
        name: 'macos-make',
        inherits: 'macos',
        ignore: true,
        generator: 'Unix Makefiles',
    },
    {
        name: 'macos-ninja',
        inherits: 'macos',
        ignore: true,
        generator: 'Ninja',
    },
    {
        name: 'macos-xcode',
        inherits: 'macos',
        ignore: true,
        generator: 'Xcode',
        opener: 'xcode',
    },
    {
        name: 'macos-vscode',
        inherits: 'macos',
        ignore: true,
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
        name: 'linux',
        ignore: true,
        platform: 'linux',
        compilers: ['gcc', 'clang'],
        validate: () => ({ valid: true, hints: [] }),
    },
    {
        name: 'linux-make',
        inherits: 'linux',
        ignore: true,
        generator: 'Unix Makefiles',
    },
    {
        name: 'linux-ninja',
        inherits: 'linux',
        ignore: true,
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
        name: 'wasi',
        ignore: true,
        platform: 'wasi',
        runner: 'wasi',
        toolchainFile: '@sdks:wasisdk/share/cmake/wasi-sdk.cmake',
        compilers: ['clang'],
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
