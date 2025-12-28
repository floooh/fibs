import { log } from '../lib/index.ts';
import type { Config, OpenerDesc, Project } from '../types.ts';
import { run } from '../tools/vscode.ts';
import { ensureDirSync } from '@std/fs';

export const vscodeOpener: OpenerDesc = { name: 'vscode', generate, open };

async function generate(project: Project, config: Config) {
    const vscodeDir = `${project.dir()}/.vscode`;
    ensureDirSync(vscodeDir);
    writeWorkspaceFile(project, config, vscodeDir);
    writeLaunchJson(project, config, vscodeDir);
    if (project.isEmscripten()) {
        writeHttpServer(project, config);
    }
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
    let launch;
    if (project.isEmscripten()) {
        launch = {
            version: '0.2.0',
            configurations: [{
                type: 'chrome',
                request: 'launch',
                name: 'Debug in Chrome',
                url: 'http://localhost:8080/${command:cmake.launchTargetFilename}',
                server: {
                    program: `${project.distDir(config.name)}/httpserver.js`,
                },
            }],
        };
    } else {
        const getType = () => {
            switch (project.hostPlatform()) {
                case 'windows':
                    return 'cppvsdbg';
                case 'linux':
                    return 'cppdbg';
                default:
                    // on macOS use the CodeLLDB debug extension, since the MS C/C++ debugger
                    // integration is all kinds of broken
                    return 'lldb';
            }
        };
        const getMIMode = () => project.hostPlatform() === 'linux' ? 'gdb' : undefined;
        launch = {
            version: '0.2.0',
            configurations: [{
                name: 'Debug Current Target',
                request: 'launch',
                program: '${command:cmake.launchTargetPath}',
                cwd: project.buildDir(config.name),
                args: [],
                type: getType(),
                MIMode: getMIMode(),
            }],
        };
    }
    const path = `${vscodeDir}/launch.json`;
    try {
        Deno.writeTextFileSync(path, JSON.stringify(launch, null, '  '));
    } catch (err) {
        log.panic(`Failed writing ${path} with: `, err);
    }
}

function writeHttpServer(project: Project, config: Config) {
    const path = `${project.buildDir(config.name)}`;
    let src = "const { execSync } = require('child_process');\n";
    src += "execSync('http-server -c-1 -g .', {\n";
    src += `  cwd: '${project.distDir(config.name)}',\n`;
    src += " stdio: 'inherit',\n";
    src += "  stderr: 'inherit',\n";
    src += '});\n';
    Deno.writeTextFileSync(path, src);
}
