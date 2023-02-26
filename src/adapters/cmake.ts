import { Project, Adapter, Config, TargetType, Platform, cfg, log } from '../../mod.ts';
import { cmake as cmakeTool } from '../tools/cmake.ts';
import { fs } from '../../deps.ts';

export const cmake: Adapter = {
    name: 'cmake',
    generate: generate,
    build: build,
};

export async function generate(project: Project, config: Config) {
    try {
        await Deno.writeTextFile(`${project.dir}/CMakeLists.txt`, genCMakeListsTxt(project, config), { create: true });
    } catch (err) {
        log.error(`Failed writing CMakeLists.txt: ${err.message}`);
    }
    // FIXME: write CMakePresets.json file

    // run cmake config
    const buildDir = cfg.buildDir(project, config);
    await fs.ensureDir(buildDir);
    const args = [];
    // FIXME: change this to a cmake preset name
    if (config.generator) {
        args.push(`-G${config.generator}`);
    }
    args.push(project.dir);
    const res = await cmakeTool.run({
        args,
        cwd: buildDir,
        stderr: 'piped'
    });
    if (res.exitCode !== 0) {
        log.error(`cmake returned with exit code ${res.exitCode}, stderr:\n\n${res.stderr}`);
    }
}

export async function build(project: Project, config: Config) {
    const buildDir = cfg.buildDir(project, config);
    const res = await cmakeTool.run({
        args: [ '--build', '.' ],
        cwd: buildDir,
    });
    if (res.exitCode !== 0) {
        log.error('build failed.');
    }
}

function genCMakeListsTxt(project: Project, config: Config): string {
    let str = '';
    str += 'cmake_minimum_required(VERSION 3.2)\n';
    str += 'set(CMAKE_C_STANDARD 99)\n';  // FIXME: make configurable
    str += 'set(CMAKE_CXX_STANDARD 14)\n'; // FIXME: make configurable
    str += `project(${project.name})\n`;
    project.targets.forEach((target) => {
        let subtype = '';
        if (target.type === TargetType.WindowedExe) {
            if (config.platform === Platform.Windows) {
                subtype = 'WIN32';
            } else if ((config.platform === Platform.Macos) || (config.platform === Platform.IOS)) {
                subtype = 'MACOSX_BUNDLE';
            }
        }
        str += `add_executable(${target.name}${subtype}\n`
        target.sources.forEach((source) => {
            str += `    ${project.dir}/${source}\n`
        });
        str += ')\n';
    });
    return str;
}
