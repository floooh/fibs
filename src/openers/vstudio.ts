import { Config, OpenerDesc, Project, util } from '../../mod.ts';

export const vstudioOpener: OpenerDesc = {
    configure: async (): Promise<void> => {},
    open,
};

async function open(project: Project, config: Config) {
    const path = `${util.buildDir(project, config)}/${project.name}.sln`;
    util.runCmd('start', {
        args: [ path ],
        cwd: project.dir,
        showCmd: true,
        winUseCmd: true,
    });
}
