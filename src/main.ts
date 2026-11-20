import { log, proj, util } from './lib/index.ts';
import { assertFibsModule } from './types.ts';
import { run as resetCmdRun } from './builtin/commands/reset.ts';
import { run as initCmdRun } from './builtin/commands/init.ts';
import { run as runjobCmdRun } from './builtin/commands/runjob.ts';

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
        // NOTE: reset, init and runjob don't need a configured project
        if (cmdName === 'reset') {
            await resetCmdRun();
            return;
        } else if (cmdName === 'init') {
            await initCmdRun();
            return;
        } else if (cmdName === 'runjob') {
            await runjobCmdRun(args);
            return;
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
        await cmd.run(project, args);
    } catch (err) {
        log.error(err);
    }
}
