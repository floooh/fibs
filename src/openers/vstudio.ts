import { util } from '../lib/index.ts';
import type { Config, OpenerDesc, Project } from '../types.ts';

export const vstudioOpener: OpenerDesc = {
    name: 'vstudio',
    generate: async (): Promise<void> => {},
    open,
};

async function open(project: Project, config: Config) {
    const path = `${project.buildDir(config.name)}/${project.name()}.sln`;
    await util.runCmd('start', {
        args: [path],
        cwd: project.dir(),
        showCmd: true,
        winUseCmd: true,
    });
}
