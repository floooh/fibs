import { log, RunOptions, RunResult, ToolDesc, util } from '../../mod.ts';

export const vscodeTool: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for opening projects in VSCode',
    exists: exists,
};

export async function run(options: RunOptions): Promise<RunResult> {
    const { abortOnError = true } = options;
    try {
        return await util.runCmd('code', options);
    } catch (err) {
        if (abortOnError) {
            log.error(`Failed to run 'code' with: ${err.message}`);
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
