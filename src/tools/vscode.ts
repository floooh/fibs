import { log, util } from '../lib/index.ts';
import type { RunOptions, RunResult, ToolDesc } from '../types.ts';

export const vscodeTool: ToolDesc = {
    name: 'vscode',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for opening projects in VSCode',
    exists,
};

export const vscodeCmakeTools: ToolDesc = {
    name: 'vscode-cmaketools',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg:
        'required for C/C++ development in VSCode (see: https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools)',
    exists: () => hasExtension('ms-vscode.cmake-tools'),
};

export const vscodeCppTools: ToolDesc = {
    name: 'vscode-cpptools',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for C/C++ development in VSCode (see: https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)',
    exists: () => hasExtension('ms-vscode.cpptools'),
};

export const vscodeDwarfDebugging: ToolDesc = {
    name: 'vscode-wasmdwarf',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg:
        'required for WASM debugging in VSCode (see: https://marketplace.visualstudio.com/items?itemName=ms-vscode.wasm-dwarf-debugging)',
    exists: () => hasExtension('ms-vscode.wasm-dwarf-debugging'),
};

export async function run(options: RunOptions): Promise<RunResult> {
    const { abortOnError = true } = options;
    try {
        return await util.runCmd('code', options);
    } catch (err) {
        if (abortOnError) {
            log.panic(`Failed to run 'code' with: `, err);
        } else {
            throw err;
        }
    }
}

export async function exists(): Promise<boolean> {
    try {
        const res = await run({
            args: ['--version'],
            stdout: 'piped',
            stderr: 'piped',
            showCmd: false,
            abortOnError: false,
            winUseCmd: true,
        });
        return res.exitCode === 0;
    } catch (_err) {
        return false;
    }
}

export async function hasExtension(ext: string): Promise<boolean> {
    try {
        const res = await run({
            args: ['--list-extensions'],
            stdout: 'piped',
            stderr: 'piped',
            showCmd: false,
            abortOnError: false,
            winUseCmd: true,
        });
        return (res.exitCode === 0) && (res.stdout.includes(ext));
    } catch (_err) {
        return false;
    }
}
