import { log, util } from './lib/index.ts';
import { assertFibsModule, type Project } from './types.ts';
import { resetCmd } from './commands/reset.ts';
import { configure } from './lib/proj.ts';

export async function main(importMeta: ImportMeta) {
    if (!importMeta.main) {
        return;
    }
    if (Deno.args.length < 1) {
        log.print("run 'fibs help' for more info");
        Deno.exit(10);
    }
    // special 'reset' command to wipe .fibs directory (useful when imports are broken)
    const rootDir = Deno.cwd().replaceAll('\\', '/');
    const rootPath = `${rootDir}/fibs.ts`;
    let skipCmd = false;
    if (Deno.args[0] === 'reset') {
        skipCmd = true;
        await resetCmd.run(null as unknown as Project);
    }
    try {
        // try to import a fibs.ts file from current directory
        if (!util.fileExists(rootPath)) {
            log.panic('current directory is not a fibs project (no fibs.ts found)');
        }
        const rootModule = await import(`file://${rootPath}`);
        assertFibsModule(rootModule);

        // run configure-pass (with special-case to avoid redundant target config on changing the config)
        const cmdName = Deno.args[0];
        const configureWithTargets = cmdName != 'config';
        const project = await configure(rootModule, rootDir, configureWithTargets);

        // invoke the requested command
        const cmd = project.command(cmdName);
        if (!skipCmd) {
            await cmd.run(project);
        }
    } catch (err) {
        log.panic(err);
    }
}
