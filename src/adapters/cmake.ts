import { Adapter, Config, log, Project, util } from '../../mod.ts';
import * as cmakeTool from '../tools/cmake.ts';

export const cmake: Adapter = {
    name: 'cmake',
    generate: generate,
    build: build,
};

export async function generate(project: Project, config: Config) {
    try {
        Deno.writeTextFileSync(
            `${project.dir}/CMakeLists.txt`,
            genCMakeListsTxt(project, config),
            { create: true },
        );
    } catch (err) {
        log.error(`Failed writing CMakeLists.txt: ${err.message}`);
    }
    // FIXME: write CMakePresets.json file
    await cmakeTool.configure(project, config);
}

export async function build(project: Project, config: Config) {
    const buildDir = util.buildDir(project, config);
    if (!util.fileExists(`${buildDir}/CMakeCache.txt`)) {
        await cmakeTool.configure(project, config);
    }
    await cmakeTool.build(project, config);
}

function genCMakeListsTxt(project: Project, config: Config): string {
    let str = '';
    str += 'cmake_minimum_required(VERSION 3.2)\n';
    str += 'set(CMAKE_C_STANDARD 99)\n'; // FIXME: make configurable
    str += 'set(CMAKE_CXX_STANDARD 14)\n'; // FIXME: make configurable
    str += `project(${project.name})\n`;
    project.targets.forEach((target) => {
        let subtype = '';
        if (target.type === 'windowed-exe') {
            if (config.platform === 'windows') {
                subtype = 'WIN32';
            } else if (
                (config.platform === 'macos') || (config.platform === 'ios')
            ) {
                subtype = 'MACOSX_BUNDLE';
            }
        }
        str += `add_executable(${target.name}${subtype}\n`;
        target.sources.forEach((source) => {
            str += `    ${project.dir}/${source}\n`;
        });
        str += ')\n';
    });
    return str;
}
