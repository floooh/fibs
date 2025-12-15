import {
    Adapter,
    Arch,
    BuildMode,
    Command,
    Compiler,
    Config,
    Import,
    JobBuilder,
    Opener,
    Platform,
    Project,
    Runner,
    SettingsItem,
    Target,
    Tool,
} from '../types.ts';
import { host, log, util } from '../lib/index.ts';

function hostDefaultConfig(): string {
    switch (host.platform()) {
        case 'macos':
            return 'macos-make-release';
        case 'windows':
            return 'win-vstudio-release';
        case 'linux':
            return 'linux-make-release';
    }
}

export class ProjectImpl implements Project {
    _name: string | null = null;
    _rootDir: string;
    _compiler: Compiler = 'unknown-compiler';
    cmakeVariables: Record<string, string | boolean> = {
        CMAKE_C_STANDARD: '99',
        CMAKE_CXX_STANDARD: '11',
    };
    includeDirectories: string[] = [];
    compileDefinitions: Record<string, string> = {};
    compileOptions: string[] = [];
    linkOptions: string[] = [];
    imports: Import[] = [];
    targets: Target[] = [];
    commands: Command[] = [];
    tools: Tool[] = [];
    jobs: JobBuilder[] = [];
    runners: Runner[] = [];
    openers: Opener[] = [];
    configs: Config[] = [];
    adapters: Adapter[] = [];
    settings: Record<string, SettingsItem> = {
        config: {
            default: hostDefaultConfig(),
            value: hostDefaultConfig(),
            validate: () => ({ valid: true, hint: '' }),
        },
    };

    constructor(rootDir: string) {
        this._rootDir = rootDir;
    }

    name(): string {
        if (this._name === null) {
            log.panic('Project name is not set');
        }
        return this._name;
    }

    activeConfig(): Config {
        const name = this.settings.config.value;
        const config = util.find(name, this.configs);
        if (config === undefined) {
            log.panic(`active config ${name} does not exist`);
        }
        return config;
    }

    config(configName: string): Config {
        const config = util.find(configName, this.configs);
        if (config === undefined) {
            log.panic(`unknown config ${configName} (run 'fibs list configs)`);
        }
        return config;
    }

    target(targetName: string): Target {
        const target = util.find(targetName, this.targets);
        if (target === undefined) {
            log.panic(`unknown target ${targetName} (run 'fibs list targets)`);
        }
        return target;
    }

    adapter(adapterName: string): Adapter {
        const adapter = util.find(adapterName, this.adapters);
        if (adapter === undefined) {
            log.panic(`unknown adapter ${adapterName} (run 'fibs list adapters)`);
        }
        return adapter;
    }

    command(commandName: string): Command {
        const command = util.find(commandName, this.commands);
        if (command === undefined) {
            log.panic(`unknown command ${commandName} (run 'fibs list commands)`);
        }
        return command;
    }

    import(importName: string): Import {
        const imp = util.find(importName, this.imports);
        if (imp === undefined) {
            log.panic(`unknown import ${importName} (run 'fibs list imports)`);
        }
        return imp;
    }

    tool(toolName: string): Tool {
        const tool = util.find(toolName, this.tools);
        if (tool === undefined) {
            log.panic(`unknown tool ${toolName} (run 'fibs list tools)`);
        }
        return tool;
    }

    arch(): Arch {
        return this.activeConfig().arch;
    }

    platform(): Platform {
        return this.activeConfig().platform;
    }

    compiler(): Compiler {
        return this._compiler;
    }

    buildMode(): BuildMode {
        return this.activeConfig().buildMode;
    }

    hostPlatform(): Platform {
        return host.platform();
    }

    hostArch(): Arch {
        return host.arch();
    }

    dir(): string {
        return this._rootDir;
    }

    fibsDir(): string {
        return `${this.dir()}/.fibs`;
    }

    sdkDir(): string {
        return `${this.fibsDir()}/sdks}`;
    }

    importsDir(): string {
        return `${this.fibsDir()}/imports`;
    }

    buildDir(configName?: string): string {
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return `${this.fibsDir()}/build/${configName}`;
    }

    distDir(configName?: string): string {
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return `${this.fibsDir()}/dist/${configName}`;
    }

    targetBuildDir(targetName: string, configName?: string): string {
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return `${this.buildDir(configName)}/${targetName}`;
    }

    targetDistDir(targetName: string, configName?: string): string {
        const config = (configName === undefined) ? this.activeConfig() : this.config(configName);
        const target = this.target(targetName);
        if (config.platform === 'macos' && target.type === 'windowed-exe') {
            return `${this.distDir(configName)}/${target.name}.app/Contents.MacOS`;
        } else if (config.platform === 'ios' && target.type === 'windowed-exe') {
            return `${this.distDir(configName)}/${target.name}.app`;
        } else {
            return this.distDir(configName);
        }
    }

    targetAssetsDir(targetName: string, configName?: string): string {
        const config = (configName === undefined) ? this.activeConfig() : this.config(configName);
        const target = this.target(targetName);
        if (config.platform === 'macos' && target.type === 'windowed-exe') {
            return `${this.distDir(configName)}/${target.name}.app/Contents/Resources`;
        } else if (config.platform === 'ios' && target.type === 'windowed-exe') {
            return `${this.distDir(configName)}/${target.name}.app`;
        } else {
            return this.distDir(configName);
        }
    }

    isArch(arch: Arch): boolean {
        return this.arch() === arch;
    }

    isPlatform(platform: Platform): boolean {
        return this.platform() === platform;
    }

    isWindows(): boolean {
        return this.platform() === 'windows';
    }

    isLinux(): boolean {
        return this.platform() === 'linux';
    }

    isMacOS(): boolean {
        return this.platform() === 'macos';
    }

    isIOS(): boolean {
        return this.platform() === 'ios';
    }

    isAndroid(): boolean {
        return this.platform() === 'android';
    }

    isWasi(): boolean {
        return this.platform() === 'wasi';
    }

    isEmscripten(): boolean {
        return this.platform() === 'emscripten';
    }

    isWasm(): boolean {
        return this.isWasi() || this.isEmscripten();
    }

    isHostPlatform(platform: Platform): boolean {
        return this.hostPlatform() === platform;
    }

    isHostWindows(): boolean {
        return this.hostPlatform() === 'windows';
    }

    isHostLinux(): boolean {
        return this.hostPlatform() === 'linux';
    }

    isHostMacOS(): boolean {
        return this.hostPlatform() === 'macos';
    }

    isCompiler(compiler: Compiler): boolean {
        return this._compiler === compiler;
    }

    isClang(): boolean {
        return this._compiler === 'clang' || this._compiler === 'appleclang';
    }

    isAppleClang(): boolean {
        return this._compiler === 'appleclang';
    }

    isMsvc(): boolean {
        return this._compiler === 'msvc';
    }

    isGcc(): boolean {
        return this._compiler === 'gcc';
    }

    isBuildMode(buildMode: BuildMode): boolean {
        return this.activeConfig().buildMode === buildMode;
    }

    isRelease(): boolean {
        return this.isBuildMode('release');
    }

    isDebug(): boolean {
        return this.isBuildMode('debug');
    }
}
