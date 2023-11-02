import { Config, host, log, OpenerDesc, Project, util } from '../../mod.ts';
import { run } from '../tools/vscode.ts';
import { fs } from '../../deps.ts';

export const vscodeOpener: OpenerDesc = { name: 'vscode', configure, open };

async function configure(project: Project, config: Config) {
    const vscodeDir = `${project.dir}/.vscode`;
    fs.ensureDirSync(vscodeDir);
    writeWorkspaceFile(project, config, vscodeDir);
    writeLaunchJson(project, config, vscodeDir);
}

async function open(project: Project, config: Config) {
    await run({
        args: [`${project.dir}/.vscode/${project.name}.code-workspace`],
        winUseCmd: true,
    });
}

function writeWorkspaceFile(project: Project, config: Config, vscodeDir: string) {
    const ws = {
        folders: [
            { path: project.dir },
            ...project.imports.map((imp) => {
                return { path: imp.importDir };
            }),
        ],
        settings: {
            'cmake.statusbar.advanced': {
                ctest: { visibility: 'hidden' },
                testPreset: { visibility: 'hidden' },
                debug: { visibility: 'hidden' },
            },
            'cmake.debugConfig': { cwd: util.distDir(project, config) },
            'cmake.autoSelectActiveFolder': false,
            'cmake.ignoreCMakeListsMissing': true,
            'cmake.configureOnOpen': false,
        },
    };
    const path = `${vscodeDir}/${project.name}.code-workspace`;
    log.info(`writing ${path}`);
    try {
        Deno.writeTextFileSync(path, JSON.stringify(ws, null, '  '));
    } catch (err) {
        log.error(`Failed writing ${path} with: ${err.message}`);
    }
}

function writeLaunchJson(project: Project, config: Config, vscodeDir: string) {
    const getType = () => {
        switch (host.platform()) {
            case 'windows':
                return 'cppvsdbg';
            case 'linux':
                return 'cppdbg';
            case 'macos':
                // on macOS use the CodeLLDB debug extension, since the MS C/C++ debugger
                // integration is all kinds of broken
                return 'lldb';
        }
    };
    const getMIMode = () => host.platform() === 'linux' ? 'gdb' : undefined;

    const launchConfig = {
        name: 'Debug Current Target',
        request: 'launch',
        program: '${command:cmake.launchTargetPath}',
        cwd: util.distDir(project, config),
        args: [],
        type: getType(),
        MIMode: getMIMode(),
    };
    const stopAtEntryLaunchConfig = structuredClone(launchConfig);
    stopAtEntryLaunchConfig.name = 'Debug Current Target (Stop at Entry)';
    if (stopAtEntryLaunchConfig.type === 'lldb') {
        stopAtEntryLaunchConfig.stopOnEntry = true;
    } else {
        stopAtEntryLaunchConfig.stopAtEntry = true;
    }

    const launch = {
        version: '0.2.0',
        configurations: [launchConfig, stopAtEntryLaunchConfig],
    };

    const path = `${vscodeDir}/launch.json`;
    log.info(`writing ${path}`);
    try {
        Deno.writeTextFileSync(path, JSON.stringify(launch, null, '  '));
    } catch (err) {
        log.error(`Failed writing ${path} with: ${err.message}`);
    }
}
