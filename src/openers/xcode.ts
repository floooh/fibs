import { Config, OpenerDesc, Project, util } from '../../mod.ts';

export const xcodeOpener: OpenerDesc = {
    configure: async (): Promise<void> => {},
    open,
};

async function open(project: Project, config: Config) {
    const path = `${util.buildDir(project, config)}/${project.name}.xcodeproj`;
    await util.runCmd('xed', { args: [path], showCmd: true, abortOnError: true });
}
