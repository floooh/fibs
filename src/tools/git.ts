import { log, RunOptions, RunResult, ToolDesc, util } from '../../mod.ts';

export const git: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for fetching imports',
    exists: exists,
};

export async function run(options: RunOptions): Promise<RunResult> {
    try {
        return await util.run('git', options);
    } catch (err) {
        log.error(`Failed running git with: ${err.message}`);
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
