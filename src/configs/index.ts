import { ConfigDesc } from '../../index.ts';
import { Configurer } from '../types.ts';

const win = { platform: 'windows', arch: 'x86_64' } satisfies Partial<ConfigDesc>;
const mac = { platform: 'macos', compilers: ['appleclang'] } satisfies Partial<ConfigDesc>;
const linux = { platform: 'linux', compilers: ['gcc', 'clang'] } satisfies Partial<ConfigDesc>;
const vstudio = { compilers: ['msvc'], opener: 'vstudio' } satisfies Partial<ConfigDesc>;
const xcode = { generator: 'xcode', opener: 'xcode' } satisfies Partial<ConfigDesc>;
const vscode = { generator: 'ninja', opener: 'vscode' } satisfies Partial<ConfigDesc>;
const make = { generator: 'make' } satisfies Partial<ConfigDesc>;
const ninja = { generator: 'ninja' } satisfies Partial<ConfigDesc>;
const release = { buildMode: 'release' } satisfies Partial<ConfigDesc>;
const debug = { buildMode: 'debug' } satisfies Partial<ConfigDesc>;

export function addDefaultConfigs(c: Configurer): void {
    c.addConfig({ name: 'win-vstudio-release', ...win, ...vstudio, ...release });
    c.addConfig({ name: 'win-vstudio-debug', ...win, ...vstudio, ...debug });
    c.addConfig({ name: 'macos-make-release', ...mac, ...make, ...release });
    c.addConfig({ name: 'macos-make-debug', ...mac, ...make, ...debug });
    c.addConfig({ name: 'macos-ninja-release', ...mac, ...ninja, ...release });
    c.addConfig({ name: 'macos-ninja-debug', ...mac, ...ninja, ...debug });
    c.addConfig({ name: 'macos-xcode-release', ...mac, ...xcode, ...release });
    c.addConfig({ name: 'macos-xcode-debug', ...mac, ...xcode, ...debug });
    c.addConfig({ name: 'macos-vscode-release', ...mac, ...vscode, ...release });
    c.addConfig({ name: 'macos-vscode-debug', ...mac, ...vscode, ...debug });
    c.addConfig({ name: 'linux-make-release', ...linux, ...make, ...release });
    c.addConfig({ name: 'linux-make-debug', ...linux, ...make, ...debug});
    c.addConfig({ name: 'linux-ninja-release', ...linux, ...ninja, ...release });
    c.addConfig({ name: 'linux-ninja-debug', ...linux, ...ninja, ...debug });
    c.addConfig({ name: 'linux-vscode-release', ...linux, ...vscode, ...release });
    c.addConfig({ name: 'linux-vscode-debug', ...linux, ...vscode, ...debug })
}