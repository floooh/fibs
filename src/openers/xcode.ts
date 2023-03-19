import { Config, OpenerDesc, Project, util } from '../../mod.ts';

export const xcodeOpener: OpenerDesc = {
    open: open,
};

async function open(project: Project, config: Config) {
    const path = `${util.buildDir(project, config)}/${project.name}.xcodeproj`;
    util.runCmd('xed', { args: [path], showCmd: true, abortOnError: true });
}
