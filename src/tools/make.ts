import { log, RunOptions, RunResult, ToolDesc, util } from '../../mod.ts';

export const makeTool: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: true,
    notFoundMsg: 'required for building *-make-* configs',
    exists: exists,
}

export async function run(options: RunOptions): Promise<RunResult> {
    const { abortOnError = true } = options;
    try {
        return await util.runCmd('make', options);
    } catch (err) {
        if (abortOnError) {
            log.error(`Failed running make with: ${err.message}`);
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
