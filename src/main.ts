import { log, proj, util } from './lib/index.ts';
import { assertFibsModule } from './types.ts';
import { run as resetCmdRun } from './commands/reset.ts';
import { run as initCmdRun } from './commands/init.ts';

export async function main() {
    if (Deno.args.length < 1) {
        log.print("run 'fibs help' for more info");
        Deno.exit(10);
    }
    let args = Deno.args;
    if (args.includes('--verbose')) {
        log.setVerbose(true);
        args = args.filter((arg) => arg !== '--verbose');
    }
    try {
        // special 'reset' command to wipe .fibs directory (useful when imports are broken)
        const rootDir = Deno.cwd().replaceAll('\\', '/');
        const rootPath = `${rootDir}/fibs.ts`;
        const cmdName = args[0];
        let skipCmd = false;
        if (cmdName === 'reset') {
            skipCmd = true;
            await resetCmdRun();
        } else if (cmdName === 'init') {
            skipCmd = true;
            await initCmdRun();
        }
        // try to import a fibs.ts file from current directory
        if (!util.fileExists(rootPath)) {
            throw new Error('current directory is not a fibs project (no fibs.ts found)');
        }
        const importPath = `file://${rootPath}`;
        const rootModule = await import(importPath);
        assertFibsModule(rootModule);

        // run configure-pass (with special-case to avoid redundant target config on changing the config)
        const project = await proj.configure(rootModule, rootDir, cmdName !== 'config');
        const cmd = project.command(cmdName);

        // invoke the requested command (NOTE: the cmd may set Deno.exitCode)
        if (!skipCmd) {
            await cmd.run(project, args);
        }
    } catch (err) {
        log.error(err);
    }
}
