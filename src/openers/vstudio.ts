import { Config, log, OpenerDesc, Project } from '../../mod.ts';

export const vstudioOpener: OpenerDesc = {
    open: open,
};

async function open(project: Project, config: Config) {
    log.error('FIXME: implement vstudio opener');
}
