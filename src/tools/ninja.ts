import { Platform, Tool, ToolRunResult, tool, log } from '../../mod.ts';
import { ToolRunOptions } from '../types.ts';

export const ninja: Tool = {
    name: 'ninja',
    platforms: [Platform.Windows, Platform.Macos, Platform.Linux],
    optional: false,
    notFoundMsg: 'required for building *-ninja-* configs',
    exists: exists,
    run: run,
};

export async function exists(): Promise<boolean> {
    try {
        await tool.run('ninja', { args: ['--version'], stdout: 'piped' });
        return true;
    } catch (_err) {
        return false;
    }
}

export async function run(options: ToolRunOptions): Promise<ToolRunResult> {
    log.error('ninja.run() not implemented');
}
