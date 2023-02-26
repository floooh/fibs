import { Platform, Tool, ToolRunOptions, ToolRunResult, log, tool } from '../../mod.ts';

export const cmake: Tool = {
    name: 'cmake',
    platforms: [Platform.Windows, Platform.Macos, Platform.Linux],
    optional: false,
    notFoundMsg: 'required for building projects',
    exists: exists,
    run: run,
};

export async function exists(): Promise<boolean> {
    try {
        await tool.run('cmake', { args: ['--version'], stdout: 'piped' });
        return true;
    } catch (_err) {
        return false;
    }
}

export async function run(options: ToolRunOptions): Promise<ToolRunResult> {
    try {
        return await tool.run('cmake', options);
    } catch (err) {
        log.error(`Failed running cmake with: ${err.message}`);
    }
}
