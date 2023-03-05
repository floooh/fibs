import { log, RunOptions, RunResult, ToolDesc, util } from '../../mod.ts';

export const ninja: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for building *-ninja-* configs',
    exists: exists,
};

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.runCmd('ninja', options);
    } catch (err) {
        if (options.abortOnError === true) {
            log.error(`Failed running ninja with: ${err.message}`);
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
