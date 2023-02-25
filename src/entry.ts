import { Project } from './types.ts';
import * as cmd from './cmd.ts';
import * as tool from './tool.ts';
import * as log from './log.ts';

export async function run(project: Project) {
  if (Deno.args.length < 1) {
    log.print("run 'fibs help' for more info");
    Deno.exit(10);
  }
  await cmd.importAll(project);
  await tool.importAll(project);
  await cmd.run(project, Deno.args[0]);
}
