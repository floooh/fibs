import { Config, log, OpenerDesc, Project } from '../../mod.ts';

export const vscodeOpener: OpenerDesc = {
    open: open,
};

async function open(project: Project, config: Config) {
    log.error('FIXME: implement vscode opener');
}
