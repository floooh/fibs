import { Config, log, OpenerDesc, Project } from '../../mod.ts';

export const vscodeOpener: OpenerDesc = { configure, open };

async function configure(project: Project, config: Config) {
    log.warn('FIXME: implement vscode.configure()');
}

async function open(project: Project, config: Config) {
    log.error('FIXME: implement vscode opener');
}
