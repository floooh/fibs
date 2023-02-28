import { ToolRunOptions, ToolRunResult } from './types.ts';
import * as log from './log.ts';

export async function run(
    cmd: string,
    options: ToolRunOptions,
): Promise<ToolRunResult> {
    const cmdLine = [cmd, ...options.args];
    const showCmd = options.showCmd ?? true;
    if (showCmd) {
        log.run(cmdLine);
    }
    const p = Deno.run({
        cmd: cmdLine,
        cwd: options.cwd,
        stdout: options.stdout,
        stderr: options.stderr,
    });
    const res: ToolRunResult = {
        exitCode: (await p.status()).code,
        stdout: (options.stdout === 'piped') ? new TextDecoder().decode(await p.output()) : '',
        stderr: (options.stderr === 'piped') ? new TextDecoder().decode(await p.stderrOutput()) : '',
    };
    return res;
}
