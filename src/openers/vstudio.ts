import { util } from '../lib/index.ts';
import type { Config, OpenerDesc, Project } from '../types.ts';

export const vstudioOpener: OpenerDesc = {
    name: 'vstudio',
    generate: async (): Promise<void> => {},
    open,
};

async function open(project: Project, config: Config) {
    // up to VS2022, solution files have the .sln extension, since VS2026 .slnx
    const pathBase = `${project.buildDir(config.name)}/${project.name()}`;
    let path = `${pathBase}.slnx`;
    if (!util.fileExists(path)) {
        path = `${pathBase}.sln`;
    }
    await util.runCmd('start', {
        args: [path],
        cwd: project.dir(),
        showCmd: true,
        winUseCmd: true,
    });
}
