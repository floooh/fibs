import { Config, OpenerDesc, Project, util } from '../../index.ts';

export const vstudioOpener: OpenerDesc = {
    name: 'vstudio',
    configure: async (): Promise<void> => {},
    open,
};

async function open(project: Project, config: Config) {
    const path = `${util.buildDir(project, config)}/${project.name}.sln`;
    await util.runCmd('start', {
        args: [path],
        cwd: project.dir,
        showCmd: true,
        winUseCmd: true,
    });
}
