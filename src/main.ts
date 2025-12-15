import { log, util } from './lib/index.ts';
import { ProjectImpl } from './impl/project.ts';
import { Project, assertFibsModule } from './types.ts';
import { resetCmd } from './commands/reset.ts';
import { configure } from './lib/configure.ts';

export async function main() {
    if (Deno.args.length < 1) {
        log.print('run \'fibs help\' for more info');
        Deno.exit(10);
    }
    // special 'reset' command to wipe .fibs directory (useful when imports are broken)
    const cwd = Deno.cwd().replaceAll('\\', '/');
    const rootPath = `${cwd}/fibs.ts`;
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

        // run configure- and build-tree pass
        const project = new ProjectImpl(cwd);
        await configure(rootModule, project);
        //await build(rootModule, project);

        const cmdName = Deno.args[0];
        const cmd = project.command(cmdName);
        if (!skipCmd) {
            await cmd.run(project);
        }
    } catch (err) {
        log.panic(err);
    }
}
