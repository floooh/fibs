import { log, Tool, tool, ToolRunOptions, ToolRunResult } from '../../mod.ts';

export const git: Tool = {
    name: 'git',
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for fetching imports',
    exists: exists,
};

export async function exists(): Promise<boolean> {
    try {
        await tool.run('git', {
            args: ['--version'],
            stdout: 'piped',
            showCmd: false,
        });
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
