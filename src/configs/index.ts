import { ConfigDesc } from '../types.ts';

const win = { platform: 'windows', arch: 'x86_64' };
const mac = { platform: 'macos' };
const linux = { platform: 'linux' };
const vstudio = { compilers: ['msvc'], opener: 'vstudio' };
const xcode = { generator: 'xcode', opener: 'xcode' };
const vscode = { generator: 'ninja', opener: 'vscode' };
const make = { generator: 'make' };
const ninja = { generator: 'ninja' };
const release = { buildMode: 'release' };
const debug = { buildMode: 'debug' };

export const builtinConfigs = [
    { ...win, ...vstudio, ...release, name: 'win-vstudio-release' },
    { ...win, ...vstudio, ...debug, name: 'win-vstudio-debug' },
    { ...mac, ...make, ...release, name: 'macos-make-release' },
    { ...mac, ...make, ...debug, name: 'macos-make-debug' },
    { ...mac, ...ninja, ...release, name: 'macos-ninja-release' },
    { ...mac, ...ninja, ...debug, name: 'macos-ninja-debug' },
    { ...mac, ...xcode, ...release, name: 'macos-xcode-release' },
    { ...mac, ...xcode, ...debug, name: 'macos-xcode-debug' },
    { ...mac, ...vscode, ...release, name: 'macos-vscode-release' },
    { ...mac, ...vscode, ...debug, name: 'macos-vscode-debug' },
    { ...linux, ...make, ...release, name: 'linux-make-release' },
    { ...linux, ...make, ...debug, name: 'linux-make-debug' },
    { ...linux, ...ninja, ...release, name: 'linux-ninja-release' },
    { ...linux, ...ninja, ...debug, name: 'linux-ninja-debug' },
    { ...linux, ...vscode, ...release, name: 'linux-vscode-release' },
    { ...linux, ...vscode, ...debug, name: 'linux-vscode-debug' },
] as ConfigDesc[];