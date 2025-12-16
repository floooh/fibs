import {
    AdapterDesc,
    Arch,
    ArgOrFunc,
    CmakeVariableDesc,
    CommandDesc,
    ConfigDesc,
    Configurer,
    getArg,
    ImportDesc,
    JobBuilderDesc,
    OpenerDesc,
    Platform,
    RunnerDesc,
    SettingDesc,
    ToolDesc,
} from '../types.ts';
import { host, log, util } from '../lib/index.ts';

export class ConfigurerImpl implements Configurer {
    projectName: string | null = null;
    rootDir: string;
    cmakeVariables: CmakeVariableDesc[] = [];
    imports: ImportDesc[] = [];
    commands: CommandDesc[] = [];
    jobs: JobBuilderDesc[] = [];
    tools: ToolDesc[] = [];
    runners: RunnerDesc[] = [];
    openers: OpenerDesc[] = [];
    configs: ConfigDesc[] = [];
    adapters: AdapterDesc[] = [];
    settings: SettingDesc[] = [];

    constructor(rootDir: string) {
        this.rootDir = rootDir;
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

    setProjectName(name: string): void {
        this.projectName = name;
    }

    addCmakeVariable(name: string, value: string | boolean): void {
        if (util.find(name, this.cmakeVariables)) {
            log.panic(`duplicate cmake variable: ${name}`);
        }
        this.cmakeVariables.push({ name, value });
    }

    addImport(arg: ArgOrFunc<ImportDesc>): void {
        const imp = getArg(arg);
        if (util.find(imp.name, this.imports)) {
            log.panic(`duplicate import: ${imp.name}`);
        }
        this.imports.push(imp);
    }

    addCommand(arg: ArgOrFunc<CommandDesc>): void {
        const cmd = getArg(arg);
        if (util.find(cmd.name, this.commands)) {
            log.panic(`duplicate command: ${cmd.name}`);
        }
        this.commands.push(cmd);
    }

    addJob(arg: ArgOrFunc<JobBuilderDesc>): void {
        const job = getArg(arg);
        if (util.find(job.name, this.jobs)) {
            log.panic(`duplicate job: ${job.name}`);
        }
        this.jobs.push(job);
    }

    addTool(arg: ArgOrFunc<ToolDesc>): void {
        const tool = getArg(arg);
        if (util.find(tool.name, this.tools)) {
            log.panic(`duplicate tool: ${tool.name}`);
        }
        this.tools.push(tool);
    }

    addRunner(arg: ArgOrFunc<RunnerDesc>): void {
        const runner = getArg(arg);
        if (util.find(runner.name, this.runners)) {
            log.panic(`duplicate runner: ${runner.name}`);
        }
        this.runners.push(runner);
    }

    addOpener(arg: ArgOrFunc<OpenerDesc>): void {
        const opener = getArg(arg);
        if (util.find(opener.name, this.openers)) {
            log.panic(`duplicate opener: ${opener.name}`);
        }
        this.openers.push(opener);
    }

    addConfig(arg: ArgOrFunc<ConfigDesc>): void {
        const config = getArg(arg);
        if (util.find(config.name, this.configs)) {
            log.panic(`duplicate config: ${config.name}`);
        }
        this.configs.push(config);
    }

    addAdapter(arg: ArgOrFunc<AdapterDesc>): void {
        const adapter = getArg(arg);
        if (util.find(adapter.name, this.adapters)) {
            log.panic(`duplicate adapter: ${adapter.name}`);
        }
        this.adapters.push(adapter);
    }

    addSetting(arg: ArgOrFunc<SettingDesc>): void {
        const setting = getArg(arg);
        if (util.find(setting.name, this.adapters)) {
            log.panic(`duplicate setting: ${setting.name}`);
        }
        this.settings.push(setting);
    }
}
