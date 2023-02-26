import { ToolRunOptions, ToolRunResult } from './types.ts';

export async function run(cmd: string, options: ToolRunOptions): Promise<ToolRunResult> {
    const p = Deno.run({
        cmd: [cmd, ...options.args],
        cwd: options.cwd,
        stdout: options.stdout,
        stderr: options.stderr
    });
    const res: ToolRunResult = {
        exitCode: (await p.status()).code,
        stdout: (options.stdout === 'piped') ? new TextDecoder().decode(await p.output()) : '',
        stderr: (options.stderr === 'piped') ? new TextDecoder().decode(await p.stderrOutput()) : '',
    }
    return res;
}
