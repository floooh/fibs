import { util } from '../lib/index.ts';
import type { Config, OpenerDesc, Project } from '../types.ts';

export const xcodeOpener: OpenerDesc = {
    name: 'xcode',
    generate: async (): Promise<void> => {},
    open,
};

async function open(project: Project, config: Config) {
    const path = `${project.buildDir(config.name)}/${project.name()}.xcodeproj`;
    await util.runCmd('xed', { args: [path], showCmd: true, abortOnError: true });
}
