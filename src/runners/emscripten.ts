import { Config, host, http, Project, RunnerDesc, RunOptions, Target, util } from '../../mod.ts';

export const emscriptenRunner: RunnerDesc = { run };

async function run(project: Project, config: Config, target: Target, options: RunOptions) {
    // can assume here that run() will only be called for executable targets
    const url = `http://localhost:8080/${target.name}.html`;
    switch (host.platform()) {
        case 'macos':
            util.runCmd('open', { args: [url] });
            break;
        case 'linux':
            util.runCmd('xdg-open', { args: [url] });
            break;
        case 'windows':
            util.runCmd('cmd', { args: ['/c', 'start', url] });
            break;
    }
    await http.serve({ target: util.distDir(project, config), port: '8080' });
}
