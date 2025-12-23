import type {
    Adapter,
    Arch,
    CmakeInclude,
    CmakeVariable,
    Command,
    CompileDefinition,
    CompileOption,
    Compiler,
    Config,
    FibsModule,
    Import,
    IncludeDirectory,
    JobBuilder,
    LinkOption,
    Opener,
    Platform,
    Project,
    Runner,
    Setting,
    Target,
    Tool,
} from '../types.ts';
import { host, log, settings, util } from '../lib/index.ts';
import { path } from '../../deps.ts';

export class ProjectImpl implements Project {
    _name: string;
    _rootModule: FibsModule;
    _rootDir: string;
    _compiler: Compiler = 'unknown-compiler';
    _importOptionsFuncs: ((p: Project) => Record<string, unknown>)[] = [];
    _importOptions: Record<string, unknown> = {};
    _cmakeVariables: CmakeVariable[] = [];
    _cmakeIncludes: CmakeInclude[] = [];
    _includeDirectories: IncludeDirectory[] = [];
    _compileDefinitions: CompileDefinition[] = [];
    _compileOptions: CompileOption[] = [];
    _linkOptions: LinkOption[] = [];
    _imports: Import[] = [];
    _targets: Target[] = [];
    _commands: Command[] = [];
    _tools: Tool[] = [];
    _jobs: JobBuilder[] = [];
    _runners: Runner[] = [];
    _openers: Opener[] = [];
    _configs: Config[] = [];
    _adapters: Adapter[] = [];
    _settings: Setting[] = [];

    constructor(rootModule: FibsModule, rootDir: string) {
        this._name = path.basename(rootDir);
        this._rootModule = rootModule;
        this._rootDir = rootDir;
    }

    name(): string {
        return this._name;
    }

    activeConfig(): Config {
        return this.config(settings.get(this, 'config'));
    }

    compiler(): Compiler {
        return this._compiler;
    }

    platform(): Platform {
        return this.activeConfig().platform;
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
        return util.fibsDir(this._rootDir);
    }

    sdkDir(): string {
        return util.sdkDir(this._rootDir);
    }

    importsDir(): string {
        return util.importsDir(this._rootDir);
    }

    importDir(importName: string): string {
        const imp = util.find(importName, this._imports);
        if (imp === undefined) {
            log.panic(`Project.importDir(): unknown import name ${importName}`);
        }
        return imp.importDir;
    }

    configDir(configName?: string): string {
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return util.configDir(this._rootDir, configName);
    }

    buildDir(configName?: string): string {
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return util.buildDir(this._rootDir, configName);
    }

    distDir(configName?: string): string {
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return util.distDir(this._rootDir, configName);
    }

    targetDir(targetName: string): string {
        const target = util.find(targetName, this._targets);
        if (target === undefined) {
            log.panic(`Project.targetDir(): Unknown target ${targetName}`);
        }
        return target.dir;
    }

    targetBuildDir(targetName: string, configName?: string): string {
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return util.targetBuildDir(this._rootDir, configName, targetName);
    }

    targetDistDir(targetName: string, configName?: string): string {
        const config = (configName === undefined) ? this.activeConfig() : this.config(configName);
        const target = this.target(targetName);
        return util.targetDistDir(this._rootDir, config.name, targetName, config.platform, target.type);
    }

    targetAssetsDir(targetName: string, configName?: string): string {
        const config = (configName === undefined) ? this.activeConfig() : this.config(configName);
        const target = this.target(targetName);
        return util.targetAssetDir(this._rootDir, config.name, targetName, config.platform, target.type);
    }

    settings(): Setting[] {
        return this._settings;
    }

    cmakeVariables(): CmakeVariable[] {
        return this._cmakeVariables;
    }

    cmakeIncludes(): CmakeInclude[] {
        return this._cmakeIncludes;
    }

    configs(): Config[] {
        return this._configs;
    }

    targets(): Target[] {
        return this._targets;
    }

    adapters(): Adapter[] {
        return this._adapters;
    }

    commands(): Command[] {
        return this._commands;
    }

    imports(): Import[] {
        return this._imports;
    }

    tools(): Tool[] {
        return this._tools;
    }

    jobs(): JobBuilder[] {
        return this._jobs;
    }

    runners(): Runner[] {
        return this._runners;
    }

    openers(): Opener[] {
        return this._openers;
    }

    includeDirectories(): IncludeDirectory[] {
        return this._includeDirectories;
    }

    compileDefinitions(): CompileDefinition[] {
        return this._compileDefinitions;
    }

    compileOptions(): CompileOption[] {
        return this._compileOptions;
    }

    linkOptions(): LinkOption[] {
        return this._linkOptions;
    }

    importOption(name: string): unknown {
        return this._importOptions[name];
    }

    findSetting(name: string | undefined): Setting | undefined {
        return util.find(name, this._settings);
    }

    setting(name: string): Setting {
        const setting = this.findSetting(name);
        if (setting === undefined) {
            log.panic(`unknown setting ${name} (run 'fibs list settings')`);
        }
        return setting;
    }

    findConfig(name: string | undefined): Config | undefined {
        return util.find(name, this._configs);
    }

    config(name: string): Config {
        const config = this.findConfig(name);
        if (config === undefined) {
            log.panic(`unknown config ${name} (run 'fibs list configs)`);
        }
        return config;
    }

    findCompileDefinition(name: string): CompileDefinition | undefined {
        // first look through targets, then in the global definitions
        for (const t of this._targets) {
            const def = util.find(name, t.compileDefinitions);
            if (def !== undefined) {
                return def;
            }
        }
        // finally search in global definitions
        return util.find(name, this._compileDefinitions);
    }

    findTarget(name: string | undefined): Target | undefined {
        return util.find(name, this._targets);
    }

    target(name: string): Target {
        const target = this.findTarget(name);
        if (target === undefined) {
            log.panic(`unknown target ${name} (run 'fibs list targets)`);
        }
        return target;
    }

    findAdapter(name: string | undefined): Adapter | undefined {
        return util.find(name, this._adapters);
    }

    adapter(name: string): Adapter {
        const adapter = this.findAdapter(name);
        if (adapter === undefined) {
            log.panic(`unknown adapter ${name} (run 'fibs list adapters)`);
        }
        return adapter;
    }

    findCommand(name: string | undefined): Command | undefined {
        return util.find(name, this._commands);
    }

    command(name: string): Command {
        const command = this.findCommand(name);
        if (command === undefined) {
            log.panic(`unknown command ${name} (run 'fibs list commands)`);
        }
        return command;
    }

    findImport(name: string | undefined): Import | undefined {
        return util.find(name, this._imports);
    }

    import(name: string): Import {
        const imp = this.findImport(name);
        if (imp === undefined) {
            log.panic(`unknown import ${name} (run 'fibs list imports)`);
        }
        return imp;
    }

    findTool(name: string | undefined): Tool | undefined {
        return util.find(name, this._tools);
    }

    tool(name: string): Tool {
        const tool = this.findTool(name);
        if (tool === undefined) {
            log.panic(`unknown tool ${name} (run 'fibs list tools)`);
        }
        return tool;
    }

    findRunner(name: string | undefined): Runner | undefined {
        return util.find(name, this._runners);
    }

    runner(name: string): Runner {
        const runner = this.findRunner(name);
        if (runner === undefined) {
            log.panic(`unknown runner ${name} (run 'fibs list runners)`);
        }
        return runner;
    }

    findOpener(name: string | undefined): Opener | undefined {
        return util.find(name, this._openers);
    }

    opener(name: string): Opener {
        const opener = this.findOpener(name);
        if (opener === undefined) {
            log.panic(`unknown opener ${name} (run 'fibs list openers)`);
        }
        return opener;
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
}
