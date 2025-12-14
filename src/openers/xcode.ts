import { Config, OpenerDesc, Project, util } from '../../index.ts';

export const xcodeOpener: OpenerDesc = {
    name: 'xcode',
    configure: async (): Promise<void> => {},
    open,
};

async function open(project: Project, config: Config) {
    const path = `${project.buildDir(config.name)}/${project.name}.xcodeproj`;
    await util.runCmd('xed', { args: [path], showCmd: true, abortOnError: true });
}
