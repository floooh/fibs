import { log, RunOptions, RunResult, ToolDesc, util } from '../../mod.ts';

export const vscodeTool: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for opening projects in VSCode',
    exists: exists,
}

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.runCmd('code', options);
    } catch (err) {
        if (options.abortOnError === true) {
            log.error(`Failed to run 'code' with: ${err.message}`);
        } else {
            throw err;
        }
    }
}

export async function exists(): Promise<boolean> {
    try {
        await run({ args: ['--version'], stdout: 'piped', showCmd: false, abortOnError: false });
        return true;
    } catch (_err) {
        return false;
    }
}
