import { Project, Adapter, Config, TargetType, Platform, log } from '../../mod.ts';

export const cmake: Adapter = {
    name: 'cmake',
    generate: generate,
};

export async function generate(project: Project, config: Config) {
    try {
        await Deno.writeTextFile(`${project.dir}/CMakeLists.txt`, genCMakeListsTxt(project, config), { create: true });
    } catch (err) {
        log.error(`Failed writing CMakeLists.txt: ${err.message}`);
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
