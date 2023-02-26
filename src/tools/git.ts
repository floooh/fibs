import { Platform, Tool, ToolRunOptions, ToolRunResult, log, tool } from '../../mod.ts';

export const git: Tool = {
    name: 'git',
    platforms: [Platform.Windows, Platform.Macos, Platform.Linux],
    optional: false,
    notFoundMsg: 'required for fetching imports',
    exists: exists,
    run: run,
};

export async function exists(): Promise<boolean> {
    try {
        await tool.run('git', { args: ['--version'], stdout: 'piped' });
        return true;
    } catch (_err) {
        return false;
    }
}

export async function run(options: ToolRunOptions): Promise<ToolRunResult> {
    try {
        return await tool.run('git', options);
    } catch (err) {
        log.error(`Failed running git with: ${err.message}`);
    }
}
