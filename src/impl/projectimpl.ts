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

    //=== IConfigPhaseInfo
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

    //=== IBuildPhaseInfo
    activeConfig(): Config {
        return this.config(settings.get(this, 'config'));
    }
    platform(): Platform {
        return this.activeConfig().platform;
    }
    compiler(): Compiler {
        return this._compiler;
    }
    importDir(importName: string): string {
        const imp = util.find(importName, this._imports);
        if (imp === undefined) {
            log.panic(`Project.importDir(): unknown import name ${importName}`);
        }
        return imp.importDir;
    }
    importOption(name: string): unknown {
        return this._importOptions[name];
    }
    settings(): Setting[] {
        return this._settings;
    }
    configs(): Config[] {
        return this._configs;
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
    findSetting(name: string | undefined): Setting | undefined {
        return util.find(name, this._settings);
    }
    findConfig(name: string | undefined): Config | undefined {
        return util.find(name, this._configs);
    }
    findAdapter(name: string | undefined): Adapter | undefined {
        return util.find(name, this._adapters);
    }
    findCommand(name: string | undefined): Command | undefined {
        return util.find(name, this._commands);
    }
    findImport(name: string | undefined): Import | undefined {
        return util.find(name, this._imports);
    }
    findTool(name: string | undefined): Tool | undefined {
        return util.find(name, this._tools);
    }
    findRunner(name: string | undefined): Runner | undefined {
        return util.find(name, this._runners);
    }
    findOpener(name: string | undefined): Opener | undefined {
        return util.find(name, this._openers);
    }
    setting(name: string): Setting {
        const setting = this.findSetting(name);
        if (setting === undefined) {
            log.panic(`unknown setting: ${name}`);
        }
        return setting;
    }
    config(name: string): Config {
        const config = this.findConfig(name);
        if (config === undefined) {
            log.panic(`unknown config: ${name}`);
        }
        return config;
    }
    adapter(name: string): Adapter {
        const adapter = this.findAdapter(name);
        if (adapter === undefined) {
            log.panic(`unknown adapter: ${name}`);
        }
        return adapter;
    }
    command(name: string): Command {
        const command = this.findCommand(name);
        if (command === undefined) {
            log.panic(`unknown command: ${name}`);
        }
        return command;
    }
    import(name: string): Import {
        const imp = this.findImport(name);
        if (imp === undefined) {
            log.panic(`unknown import: ${name}`);
        }
        return imp;
    }
    tool(name: string): Tool {
        const tool = this.findTool(name);
        if (tool === undefined) {
            log.panic(`unknown tool: ${name}`);
        }
        return tool;
    }
    runner(name: string): Runner {
        const runner = this.findRunner(name);
        if (runner === undefined) {
            log.panic(`unknown runner: ${name}`);
        }
        return runner;
    }
    opener(name: string): Opener {
        const opener = this.findOpener(name);
        if (opener === undefined) {
            log.panic(`unknown opener: ${name}`);
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

    //=== IExecutePhaseInfo
    name(): string {
        return this._name;
    }
    targetSourceDir(targetName: string): string {
        return this.target(targetName).dir;
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
        return util.targetAssetsDir(this._rootDir, config.name, targetName, config.platform, target.type);
    }
    cmakeVariables(): CmakeVariable[] {
        return this._cmakeVariables;
    }
    cmakeIncludes(): CmakeInclude[] {
        return this._cmakeIncludes;
    }
    targets(): Target[] {
        return this._targets;
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
    findTarget(name: string | undefined): Target | undefined {
        return util.find(name, this._targets);
    }
    target(name: string): Target {
        const target = this.findTarget(name);
        if (target === undefined) {
            log.panic(`unknown target ${name}`);
        }
        return target;
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
}
