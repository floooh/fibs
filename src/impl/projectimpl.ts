import {
    type Arch,
    type CmakeInclude,
    type CmakeVariable,
    type Command,
    type CompileDefinition,
    type CompileOption,
    type Compiler,
    type Config,
    type FibsModule,
    type Import,
    type IncludeDirectory,
    type JobBuilder,
    type LinkDirectory,
    type LinkOption,
    type Opener,
    type Platform,
    type Project,
    ProjectPhase,
    type Runner,
    type Schema,
    type Setting,
    type Target,
    type Tool,
} from '../types.ts';
import { host, util } from '../lib/index.ts';
import { path } from '../deps.ts';

export class ProjectImpl implements Project {
    _phase: ProjectPhase;
    _activeConfig: Config | undefined;
    _name: string;
    _rootModule: FibsModule;
    _rootDir: string;
    _compiler: Compiler = 'unknown-compiler';
    _importOptionsFuncs: ((p: Project) => Record<string, unknown>)[] = [];
    _importOptions: Record<string, unknown> = {};
    _cmakeVariables: CmakeVariable[] = [];
    _cmakeIncludes: CmakeInclude[] = [];
    _includeDirectories: IncludeDirectory[] = [];
    _linkDirectories: LinkDirectory[] = [];
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
    _settings: Setting[] = [];

    constructor(rootModule: FibsModule, rootDir: string) {
        this._phase = ProjectPhase.Initial;
        this._name = path.basename(rootDir);
        this._rootModule = rootModule;
        this._rootDir = rootDir;
    }

    setActiveConfig(configName: string): void {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        this._activeConfig = this.config(configName);
    }

    phase(): ProjectPhase {
        return this._phase;
    }
    assertPhaseExact(phase: ProjectPhase): void {
        if (this._phase !== phase) {
            throw new Error(`Expected project phase ${phase}, but current phase is ${this._phase}`);
        }
    }
    assertPhaseAtLeast(phase: ProjectPhase): void {
        if (this._phase < phase) {
            throw new Error(`Expected project phase to be at least ${phase}, but current phase is ${this._phase}`);
        }
    }
    setPhase(phase: ProjectPhase): void {
        this._phase = phase;
    }

    //=== IConfigPhaseInfo
    hostPlatform(): Platform {
        this.assertPhaseAtLeast(ProjectPhase.Configure);
        return host.platform();
    }
    hostArch(): Arch {
        this.assertPhaseAtLeast(ProjectPhase.Configure);
        return host.arch();
    }
    dir(): string {
        this.assertPhaseAtLeast(ProjectPhase.Configure);
        return this._rootDir;
    }
    fibsDir(): string {
        this.assertPhaseAtLeast(ProjectPhase.Configure);
        return util.fibsDir(this._rootDir);
    }
    sdkDir(): string {
        this.assertPhaseAtLeast(ProjectPhase.Configure);
        return util.sdkDir(this._rootDir);
    }
    importsDir(): string {
        this.assertPhaseAtLeast(ProjectPhase.Configure);
        return util.importsDir(this._rootDir);
    }
    configDir(configName?: string): string {
        this.assertPhaseAtLeast(ProjectPhase.Configure);
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return util.configDir(this._rootDir, configName);
    }
    buildDir(configName?: string): string {
        this.assertPhaseAtLeast(ProjectPhase.Configure);
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return util.buildDir(this._rootDir, configName);
    }
    distDir(configName?: string): string {
        this.assertPhaseAtLeast(ProjectPhase.Configure);
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return util.distDir(this._rootDir, configName);
    }

    //=== IBuildPhaseInfo
    activeConfig(): Config {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        if (this._activeConfig === undefined) {
            throw new Error('active config not set');
        }
        return this._activeConfig;
    }
    platform(): Platform {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this.activeConfig().platform;
    }
    compiler(): Compiler {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this._compiler;
    }
    importDir(importName: string): string {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        const imp = util.find(importName, this._imports);
        if (imp === undefined) {
            throw new Error(`Project.importDir(): unknown import name ${importName}`);
        }
        return imp.importDir;
    }
    importOptions<T>(name: string, schema: Schema): T {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        const opts = this._importOptions[name] ?? {};
        const { valid, hints } = util.validate(opts, schema);
        if (valid) {
            return opts as T;
        } else {
            throw new Error(`import options validation failed for '${name}':\n\n${hints.map((hint) => `  ${hint}`).join('\n')}\n`);
        }
    }
    settings(): Setting[] {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this._settings;
    }
    configs(): Config[] {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this._configs;
    }
    commands(): Command[] {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this._commands;
    }
    imports(): Import[] {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this._imports;
    }
    tools(): Tool[] {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this._tools;
    }
    jobs(): JobBuilder[] {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this._jobs;
    }
    runners(): Runner[] {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this._runners;
    }
    openers(): Opener[] {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return this._openers;
    }
    findSetting(name: string): Setting | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return util.find(name, this._settings);
    }
    findConfig(name: string): Config | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return util.find(name, this._configs);
    }
    findCommand(name: string): Command | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return util.find(name, this._commands);
    }
    findImport(name: string): Import | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return util.find(name, this._imports);
    }
    findTool(name: string): Tool | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return util.find(name, this._tools);
    }
    findRunner(name: string): Runner | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return util.find(name, this._runners);
    }
    findOpener(name: string): Opener | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        return util.find(name, this._openers);
    }
    findImportModule(importName: string, filename?: string): FibsModule | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Build);
        const imp = this.findImport(importName);
        if (imp !== undefined) {
            const mod = util.find(filename ?? 'fibs.ts', imp.modules);
            if (mod !== undefined) {
                return mod.module;
            }
        }
        return undefined;
    }
    setting(name: string): Setting {
        const setting = this.findSetting(name);
        if (setting === undefined) {
            throw new Error(`unknown setting: ${name}`);
        }
        return setting;
    }
    config(name: string): Config {
        const config = this.findConfig(name);
        if (config === undefined) {
            throw new Error(`unknown config: ${name}`);
        }
        return config;
    }
    command(name: string): Command {
        const command = this.findCommand(name);
        if (command === undefined) {
            throw new Error(`unknown command: ${name}`);
        }
        return command;
    }
    import(name: string): Import {
        const imp = this.findImport(name);
        if (imp === undefined) {
            throw new Error(`unknown import: ${name}`);
        }
        return imp;
    }
    tool(name: string): Tool {
        const tool = this.findTool(name);
        if (tool === undefined) {
            throw new Error(`unknown tool: ${name}`);
        }
        return tool;
    }
    runner(name: string): Runner {
        const runner = this.findRunner(name);
        if (runner === undefined) {
            throw new Error(`unknown runner: ${name}`);
        }
        return runner;
    }
    opener(name: string): Opener {
        const opener = this.findOpener(name);
        if (opener === undefined) {
            throw new Error(`unknown opener: ${name}`);
        }
        return opener;
    }
    importModule(importName: string, filename?: string): FibsModule {
        const mod = this.findImportModule(importName, filename);
        if (mod === undefined) {
            throw new Error(`unknown import module: ${importName}/${filename}`);
        }
        return mod;
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
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this._name;
    }
    targetSourceDir(targetName: string): string {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this.target(targetName).dir;
    }
    targetBuildDir(targetName: string, configName?: string): string {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        if (configName === undefined) {
            configName = this.activeConfig().name;
        }
        return util.targetBuildDir(this._rootDir, configName, targetName);
    }
    targetDistDir(targetName: string, configName?: string): string {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        const config = (configName === undefined) ? this.activeConfig() : this.config(configName);
        const target = this.target(targetName);
        return util.targetDistDir(this._rootDir, config.name, targetName, config.platform, target.type);
    }
    targetAssetsDir(targetName: string, configName?: string): string {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        const config = (configName === undefined) ? this.activeConfig() : this.config(configName);
        const target = this.target(targetName);
        return util.targetAssetsDir(this._rootDir, config.name, targetName, config.platform, target.type);
    }
    cmakeVariables(): CmakeVariable[] {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this._cmakeVariables;
    }
    cmakeIncludes(): CmakeInclude[] {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this._cmakeIncludes;
    }
    targets(): Target[] {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this._targets;
    }
    includeDirectories(): IncludeDirectory[] {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this._includeDirectories;
    }
    linkDirectories(): LinkDirectory[] {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this._linkDirectories;
    }
    compileDefinitions(): CompileDefinition[] {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this._compileDefinitions;
    }
    compileOptions(): CompileOption[] {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this._compileOptions;
    }
    linkOptions(): LinkOption[] {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return this._linkOptions;
    }
    findTarget(name: string | undefined): Target | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
        return util.find(name, this._targets);
    }
    target(name: string): Target {
        const target = this.findTarget(name);
        if (target === undefined) {
            throw new Error(`unknown target ${name}`);
        }
        return target;
    }
    findCompileDefinition(name: string): CompileDefinition | undefined {
        this.assertPhaseAtLeast(ProjectPhase.Generate);
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
