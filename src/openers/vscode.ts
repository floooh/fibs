import { host, log } from '../lib/index.ts';
import type { Config, OpenerDesc, Project } from '../types.ts';
import { run } from '../tools/vscode.ts';
import { ensureDirSync } from '@std/fs';

export const vscodeOpener: OpenerDesc = { name: 'vscode', generate, open };

async function generate(project: Project, config: Config) {
    const vscodeDir = `${project.dir()}/.vscode`;
    ensureDirSync(vscodeDir);
    writeWorkspaceFile(project, config, vscodeDir);
    writeLaunchJson(project, config, vscodeDir);
}

async function open(project: Project) {
    await run({
        args: [`${project.dir()}/.vscode/${project.name()}.code-workspace`],
        winUseCmd: true,
    });
}

function writeWorkspaceFile(project: Project, config: Config, vscodeDir: string) {
    const ws = {
        folders: [
            { path: project.dir() },
            ...project.imports().map((imp) => {
                return { path: imp.importDir };
            }),
        ],
        settings: {
            'cmake.statusbar.advanced': {
                ctest: { visibility: 'hidden' },
                testPreset: { visibility: 'hidden' },
                debug: { visibility: 'hidden' },
            },
            'cmake.debugConfig': { cwd: project.distDir(config.name) },
            'cmake.autoSelectActiveFolder': false,
            'cmake.ignoreCMakeListsMissing': true,
            'cmake.configureOnOpen': false,
        },
    };
    const path = `${vscodeDir}/${project.name()}.code-workspace`;
    try {
        Deno.writeTextFileSync(path, JSON.stringify(ws, null, '  '));
    } catch (err) {
        log.panic(`Failed writing ${path} with: `, err);
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
        cwd: project.distDir(config.name),
        args: [],
        type: getType(),
        MIMode: getMIMode(),
    };
    let stopAtEntryLaunchConfig;
    if (launchConfig.type === 'lldb') {
        stopAtEntryLaunchConfig = {
            ...launchConfig,
            name: 'Debug Current Target (Stop at Entry)',
            stopOnEntry: true,
        };
    } else {
        stopAtEntryLaunchConfig = {
            ...launchConfig,
            name: 'Debug Current Target (Stop at Entry)',
            stopAtEntry: true,
        };
    }

    const launch = {
        version: '0.2.0',
        configurations: [launchConfig, stopAtEntryLaunchConfig],
    };

    const path = `${vscodeDir}/launch.json`;
    try {
        Deno.writeTextFileSync(path, JSON.stringify(launch, null, '  '));
    } catch (err) {
        log.panic(`Failed writing ${path} with: `, err);
    }
}
