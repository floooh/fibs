import type {
    Arch,
    CmakeCodeInjectorDesc,
    CommandDesc,
    ConfigDesc,
    Configurer,
    ImportDesc,
    ImportedModule,
    JobBuilderDesc,
    OpenerDesc,
    Platform,
    Project,
    RunnerDesc,
    SettingDesc,
    TargetAttributeInjectorDesc,
    ToolDesc,
} from '../types.ts';
import { host, util } from '../lib/index.ts';

type ImportExtra = {
    importDir?: string;
    importModules?: ImportedModule[];
};

export class ConfigurerImpl implements Configurer {
    _rootDir: string;
    _importDir: string;
    _importOptionsFuncs: ((p: Project) => Record<string, unknown>)[] = [];
    _commands: CommandDesc[] = [];
    _jobs: JobBuilderDesc[] = [];
    _tools: ToolDesc[] = [];
    _runners: RunnerDesc[] = [];
    _openers: OpenerDesc[] = [];
    _configs: ConfigDesc[] = [];
    _settings: SettingDesc[] = [];
    _cmakeCodeInjectors: CmakeCodeInjectorDesc[] = [];
    _targetAttributeInjectors: TargetAttributeInjectorDesc[] = [];

    _imports: (ImportDesc & ImportExtra)[] = [];
    _importErrors: unknown[] = [];

    constructor(rootDir: string, importDir: string) {
        this._rootDir = rootDir;
        this._importDir = importDir;
    }
    selfDir(): string {
        return this._importDir;
    }
    addImportOptions(funcOrOpts: Record<string, unknown> | ((p: Project) => Record<string, unknown>)): void {
        if (typeof funcOrOpts === 'function') {
            this._importOptionsFuncs.push(funcOrOpts);
        } else {
            this._importOptionsFuncs.push(() => {
                return funcOrOpts;
            });
        }
    }
    addImport(imp: ImportDesc): void {
        if (util.find(imp.name, this._imports)) {
            throw new Error(`duplicate import: ${imp.name}`);
        }
        this._imports.push(imp);
    }
    addCommand(cmd: CommandDesc): void {
        if (util.find(cmd.name, this._commands)) {
            throw new Error(`duplicate command: ${cmd.name}`);
        }
        this._commands.push(cmd);
    }
    addJob(job: JobBuilderDesc): void {
        if (util.find(job.name, this._jobs)) {
            throw new Error(`duplicate job: ${job.name}`);
        }
        this._jobs.push(job);
    }
    addTool(tool: ToolDesc): void {
        if (util.find(tool.name, this._tools)) {
            throw new Error(`duplicate tool: ${tool.name}`);
        }
        this._tools.push(tool);
    }
    addRunner(runner: RunnerDesc): void {
        if (util.find(runner.name, this._runners)) {
            throw new Error(`duplicate runner: ${runner.name}`);
        }
        this._runners.push(runner);
    }
    addOpener(opener: OpenerDesc): void {
        if (util.find(opener.name, this._openers)) {
            throw new Error(`duplicate opener: ${opener.name}`);
        }
        this._openers.push(opener);
    }
    addConfig(config: ConfigDesc): void {
        if (util.find(config.name, this._configs)) {
            throw new Error(`duplicate config: ${config.name}`);
        }
        this._configs.push(config);
    }
    addSetting(setting: SettingDesc): void {
        if (util.find(setting.name, this._settings)) {
            throw new Error(`duplicate setting: ${setting.name}`);
        }
        this._settings.push(setting);
    }
    addCmakeCodeInjector(desc: CmakeCodeInjectorDesc): void {
        if (util.find(desc.name, this._cmakeCodeInjectors)) {
            throw new Error(`dupliate cmake code injector: ${desc.name}`);
        }
        this._cmakeCodeInjectors.push(desc);
    }
    addTargetAttributeInjector(desc: TargetAttributeInjectorDesc): void {
        if (util.find(desc.name, this._targetAttributeInjectors)) {
            throw new Error(`duplicate target attribute injector: ${desc.name}`);
        }
        this._targetAttributeInjectors.push(desc);
    }

    //=== ICOnfigurePhaseInfo
    hostPlatform(): Platform {
        return host.platform();
    }
    hostArch(): Arch {
        return host.arch();
    }
    projectDir(): string {
        return this._rootDir;
    }
    fibsDir(): string {
        return util.fibsDir(this._rootDir);
    }
    sdkDir(): string {
        return util.sdkDir(this._rootDir);
    }
    importsDir(): string {
        return util.importsDir(this._rootDir);
    }
    configDir(configName: string): string {
        return util.configDir(this._rootDir, configName);
    }
    buildDir(configName: string): string {
        return util.buildDir(this._rootDir, configName);
    }
    distDir(configName: string): string {
        return util.distDir(this._rootDir, configName);
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
}
