import { log, ToolDesc, tool, ToolRunResult } from '../../mod.ts';
import { ToolRunOptions } from '../types.ts';

export const ninja: ToolDesc = {
    platforms: ['windows', 'macos', 'linux'],
    optional: false,
    notFoundMsg: 'required for building *-ninja-* configs',
    exists: exists,
};

export async function exists(): Promise<boolean> {
    try {
        await tool.run('ninja', {
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
    log.error('ninja.run() not implemented');
}
