import {
    AdapterDesc,
    Arch,
    CommandDesc,
    ConfigDesc,
    Configurer,
    ImportDesc,
    JobBuilderDesc,
    OpenerDesc,
    Platform,
    RunnerDesc,
    SettingsItem,
    ToolDesc,
} from '../types.ts';
import { host, log, util } from '../lib/index.ts';

export class ConfigurerImpl implements Configurer {
    name: string | null = null;
    cmakeVariables: Record<string, string | boolean> = {};
    imports: ImportDesc[] = [];
    commands: CommandDesc[] = [];
    jobs: JobBuilderDesc[] = [];
    tools: ToolDesc[] = [];
    runners: RunnerDesc[] = [];
    openers: OpenerDesc[] = [];
    configs: ConfigDesc[] = [];
    adapters: AdapterDesc[] = [];
    settings: Record<string, SettingsItem> = {};

    hostPlatform(): Platform {
        return host.platform();
    }

    hostArch(): Arch {
        return host.arch();
    }

    setProjectName(name: string): void {
        this.name = name;
    }

    addCmakeVariable(key: string, value: string | boolean): void {
        if (this.cmakeVariables[key] !== undefined) {
            log.panic(`duplicate cmake variable: ${key}`);
        }
        this.cmakeVariables[key] = value;
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

    addSetting(key: string, item: SettingsItem): void {
        if (this.settings[key] !== undefined) {
            log.panic(`duplicate settings: ${key}`);
        }
        this.settings[key] = item;
    }
}
