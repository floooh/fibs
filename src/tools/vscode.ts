import { log, util } from '../lib/index.ts';
import type { RunOptions, RunResult, ToolDesc } from '../types.ts';

export const vscodeTool: ToolDesc = {
    name: 'vscode',
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for opening projects in VSCode',
    exists,
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
