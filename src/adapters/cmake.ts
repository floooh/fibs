import { AdapterDesc, Config, log, Project, Target, util } from '../../mod.ts';
import * as cmakeTool from '../tools/cmake.ts';

export const cmake: AdapterDesc = {
    generate: generate,
    build: build,
};

export async function generate(project: Project, config: Config) {
    try {
        Deno.writeTextFileSync(
            `${project.dir}/CMakeLists.txt`,
            writeCMakeListsTxt(project, config),
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

function filePath(project: Project, dir: string | undefined, rest: string): string {
    let str = project.dir + '/';
    if (dir !== undefined) {
        str += dir + '/';
    }
    str += rest;
    return str;
}

function writeCMakeListsTxt(project: Project, config: Config): string {
    let str = '';
    str += 'cmake_minimum_required(VERSION 3.2)\n';
    str += 'set(CMAKE_C_STANDARD 99)\n'; // FIXME: make configurable
    str += 'set(CMAKE_CXX_STANDARD 14)\n'; // FIXME: make configurable
    str += `project(${project.name})\n`;
    const targets = Object.values(project.targets);
    targets.forEach((target) => {
        str += writeTarget(project, config, target);
    });
    targets.forEach((target) => {
        str += writeTargetDependencies(project, config, target);
        str += writeTargetIncludeDirectories(project, config, target);
    });
    return str;
}

function writeTarget(project: Project, config: Config, target: Target): string {
    let str = '';
    let subtype = '';
    switch (target.type) {
        case 'plain-exe':
        case 'windowed-exe':
            if (target.type === 'windowed-exe') {
                if (config.platform === 'windows') {
                    subtype = 'WIN32';
                } else if ((config.platform === 'macos') || (config.platform === 'ios')) {
                    subtype = 'MACOSX_BUNDLE';
                }
            }
            str += `add_executable(${target.name}${subtype}\n`;
            break;
        case 'lib':
            str += `add_library(${target.name} STATIC\n`;
            break;
        case 'dll':
            str += `add_library(${target.name} SHARED\n`;
            break;
    }
    target.sources.forEach((source) => {
        str += `    ${filePath(project, target.dir, source)}\n`;
    });
    str += ')\n';
    return str;
}

function writeTargetDependencies(project: Project, config: Config, target: Target): string {
    let str = '';
    if (target.deps.libs.length > 0) {
        if (target.type === 'lib') {
            str += `target_link_libraries(${target.name} INTERFACE ${target.deps.libs.join(' ')})\n`;
        } else {
            str += `target_link_libraries(${target.name} ${target.deps.libs.join(' ')})\n`;
        }
    }
    // FIXME: osx frameworks
    return str;
}

function writeTargetIncludeDirectories(project: Project, config: Config, target: Target): string {
    let str = '';
    const system = (target.includeDirectories.system === true) ? ' SYSTEM' : '';
    if (target.includeDirectories.interface) {
        const items = target.includeDirectories.interface.map((rest) => filePath(project, target.dir, rest));
        if (items.length > 0) {
            str += `target_include_directories(${target.name}${system} INTERFACE ${items.join(' ')})\n`;
        }
    }
    if (target.includeDirectories.private) {
        const items = target.includeDirectories.private.map((rest) => filePath(project, target.dir, rest));
        if (items.length > 0) {
            str += `target_include_directories(${target.name}${system} PRIVATE ${items.join(' ')})\n`;
        }
    }
    if (target.includeDirectories.public) {
        const items = target.includeDirectories.public.map((rest) => filePath(project, target.dir, rest));
        if (items.length > 0) {
            str += `target_include_directories(${target.name}${system} PUBLIC ${items.join(' ')})\n`;
        }
    }
    return str;
}
