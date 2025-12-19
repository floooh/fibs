import {
    AdapterDesc,
    Arch,
    CmakeVariableDesc,
    CommandDesc,
    ConfigDesc,
    Configurer,
    FibsModule,
    ImportDesc,
    JobBuilderDesc,
    OpenerDesc,
    Platform,
    RunnerDesc,
    SettingDesc,
    ToolDesc,
} from '../types.ts';
import { host, log, util } from '../lib/index.ts';

type ImportExtra = {
    importDir?: string;
    importModules?: FibsModule[];
}

export class ConfigurerImpl implements Configurer {
    rootDir: string;
    importModule: FibsModule;
    importDir: string;
    importErrors: unknown[] = [];
    cmakeVariables: CmakeVariableDesc[] = [];
    imports: (ImportDesc & ImportExtra)[] = [];
    commands: CommandDesc[] = [];
    jobs: JobBuilderDesc[] = [];
    tools: ToolDesc[] = [];
    runners: RunnerDesc[] = [];
    openers: OpenerDesc[] = [];
    configs: ConfigDesc[] = [];
    adapters: AdapterDesc[] = [];
    settings: SettingDesc[] = [];

    constructor(rootDir: string, importDir: string, importModule: FibsModule) {
        this.rootDir = rootDir;
        this.importDir = importDir;
        this.importModule = importModule;
    }

    hostPlatform(): Platform {
        return host.platform();
    }

    hostArch(): Arch {
        return host.arch();
    }

    projectDir(): string {
        return this.rootDir;
    }

    fibsDir(): string {
        return util.fibsDir(this.rootDir);
    }

    sdkDir(): string {
        return util.sdkDir(this.rootDir);
    }

    importsDir(): string {
        return util.importsDir(this.rootDir);
    }

    configDir(configName: string): string {
        return util.configDir(this.rootDir, configName);
    }

    buildDir(configName: string): string {
        return util.buildDir(this.rootDir, configName);
    }

    distDir(configName: string): string {
        return util.distDir(this.rootDir, configName);
    }

    addCmakeVariable(name: string, value: string | boolean): void {
        if (util.find(name, this.cmakeVariables)) {
            log.panic(`duplicate cmake variable: ${name}`);
        }
        this.cmakeVariables.push({ name, value });
    }

    addImport(imp: ImportDesc): void {
        if (util.find(imp.name, this.imports)) {
            log.panic(`duplicate import: ${imp.name}`);
        }
        this.imports.push(imp);
    }

    addCommand(cmd: CommandDesc): void {
        if (util.find(cmd.name, this.commands)) {
            log.panic(`duplicate command: ${cmd.name}`);
        }
        this.commands.push(cmd);
    }

    addJob(job: JobBuilderDesc): void {
        if (util.find(job.name, this.jobs)) {
            log.panic(`duplicate job: ${job.name}`);
        }
        this.jobs.push(job);
    }

    addTool(tool: ToolDesc): void {
        if (util.find(tool.name, this.tools)) {
            log.panic(`duplicate tool: ${tool.name}`);
        }
        this.tools.push(tool);
    }

    addRunner(runner: RunnerDesc): void {
        if (util.find(runner.name, this.runners)) {
            log.panic(`duplicate runner: ${runner.name}`);
        }
        this.runners.push(runner);
    }

    addOpener(opener: OpenerDesc): void {
        if (util.find(opener.name, this.openers)) {
            log.panic(`duplicate opener: ${opener.name}`);
        }
        this.openers.push(opener);
    }

    addConfig(config: ConfigDesc): void {
        if (util.find(config.name, this.configs)) {
            log.panic(`duplicate config: ${config.name}`);
        }
        this.configs.push(config);
    }

    addAdapter(adapter: AdapterDesc): void {
        if (util.find(adapter.name, this.adapters)) {
            log.panic(`duplicate adapter: ${adapter.name}`);
        }
        this.adapters.push(adapter);
    }

    addSetting(setting: SettingDesc): void {
        if (util.find(setting.name, this.adapters)) {
            log.panic(`duplicate setting: ${setting.name}`);
        }
        this.settings.push(setting);
    }
}
