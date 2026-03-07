import type { ConfigDesc } from '../../types.ts';

const win = { platform: 'windows' };
const mac = { platform: 'macos' };
const linux = { platform: 'linux' };
const make = { generator: 'make' };
const ninja = { generator: 'ninja' };
const release = { buildMode: 'release' };
const debug = { buildMode: 'debug' };

export const builtinConfigs = [
    { ...win, ...release, name: 'win-msvc-release' },
    { ...win, ...debug, name: 'win-msvc-debug' },
    { ...mac, ...make, ...release, name: 'macos-make-release' },
    { ...mac, ...make, ...debug, name: 'macos-make-debug' },
    { ...mac, ...ninja, ...release, name: 'macos-ninja-release' },
    { ...mac, ...ninja, ...debug, name: 'macos-ninja-debug' },
    { ...linux, ...make, ...release, name: 'linux-make-release' },
    { ...linux, ...make, ...debug, name: 'linux-make-debug' },
    { ...linux, ...ninja, ...release, name: 'linux-ninja-release' },
    { ...linux, ...ninja, ...debug, name: 'linux-ninja-debug' },
] as ConfigDesc[];
