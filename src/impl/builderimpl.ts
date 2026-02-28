import { util } from '../lib/index.ts';
import {
    type Arch,
    type Builder,
    type CmakeCodeFuncDesc,
    type CmakeTargetCodeFuncDesc,
    type CmakeVariableDesc,
    type Command,
    type CompileDefinitionsDesc,
    type CompileOptionsDesc,
    type Compiler,
    type Config,
    type FibsModule,
    type Import,
    type IncludeDirectoriesDesc,
    isCompileDefinitionsDesc,
    isCompileOptionsDesc,
    isIncludeDirectoriesDesc,
    isLinkDirectoriesDesc,
    isLinkOptionsDesc,
    type JobBuilder,
    type LinkDirectoriesDesc,
    type LinkOptionsDesc,
    type Opener,
    type Platform,
    type Project,
    type Runner,
    type Schema,
    type Setting,
    type Target,
    type TargetBuilder,
    type TargetDesc,
    type TargetType,
    type Tool,
} from '../types.ts';
import { TargetBuilderImpl } from './targetbuilderimpl.ts';
import type { ProjectImpl } from './projectimpl.ts';

export class BuilderImpl implements Builder {
    _project: ProjectImpl;
    _projectName: string | undefined;
    _importDir: string;
    _cmakeVariables: CmakeVariableDesc[] = [];
    _cmakeIncludes: string[] = [];
    _cmakeCodeFuncs: CmakeCodeFuncDesc[] = [];
    _cmakeTargetCodeFuncs: CmakeTargetCodeFuncDesc[] = [];
    _targets: TargetDesc[] = [];
    _includeDirectories: IncludeDirectoriesDesc[] = [];
    _linkDirectories: LinkDirectoriesDesc[] = [];
    _compileDefinitions: CompileDefinitionsDesc[] = [];
    _compileOptions: CompileOptionsDesc[] = [];
    _linkOptions: LinkOptionsDesc[] = [];

    constructor(project: ProjectImpl, importDir: string) {
        this._project = project;
        this._importDir = importDir;
    }
    selfDir(): string {
        return this._importDir;
    }
    setProjectName(name: string): void {
        this._projectName = name;
    }
    addCmakeVariable(name: string, value: string | boolean): void {
        if (util.find(name, this._cmakeVariables)) {
            throw new Error(`duplicate cmake variable: ${name}`);
        }
        this._cmakeVariables.push({ name, value });
    }
    addCmakeInclude(path: string): void {
        this._cmakeIncludes.push(path);
    }
    addCmakeCode(name: string, func: (project: Project, config: Config) => string): void {
        this._cmakeCodeFuncs.push({ name, func });
    }
    addTargetCmakeCode(name: string, func: (project: Project, config: Config, target: Target) => string): void {
        this._cmakeTargetCodeFuncs.push({ name, func });
    }
    addTarget(target: TargetDesc | string, type?: TargetType, fn?: (t: TargetBuilder) => void): void {
        if (typeof target === 'string') {
            if ((type === undefined) || (fn === undefined)) {
                throw Error('Builder.addTarget argument mismatch');
            }
            const b = new TargetBuilderImpl(this._project, target, type);
            fn(b);
            target = b._desc;
        }
        if (util.find(target.name, this._targets)) {
            throw new Error(`duplicate target: ${target.name}`);
        }
        this._targets.push(target);
    }
    addIncludeDirectories(dirs: IncludeDirectoriesDesc | string[]): void {
        if (isIncludeDirectoriesDesc(dirs)) {
            this._includeDirectories.push(dirs);
        } else {
            this._includeDirectories.push({ dirs });
        }
    }
    addLinkDirectories(dirs: LinkDirectoriesDesc | string[]): void {
        if (isLinkDirectoriesDesc(dirs)) {
            this._linkDirectories.push(dirs);
        } else {
            this._linkDirectories.push({ dirs });
        }
    }
    addCompileDefinitions(defs: CompileDefinitionsDesc | Record<string, string>): void {
        if (isCompileDefinitionsDesc(defs)) {
            this._compileDefinitions.push(defs);
        } else {
            this._compileDefinitions.push({ defs });
        }
    }
    addCompileOptions(opts: CompileOptionsDesc | string[]): void {
        if (isCompileOptionsDesc(opts)) {
            this._compileOptions.push(opts);
        } else {
            this._compileOptions.push({ opts });
        }
    }
    addLinkOptions(opts: LinkOptionsDesc | string[]): void {
        if (isLinkOptionsDesc(opts)) {
            this._linkOptions.push(opts);
        } else {
            this._linkOptions.push({ opts });
        }
    }

    //=== IConfigPhaseInfo
    hostPlatform(): Platform {
        return this._project.hostPlatform();
    }
    hostArch(): Arch {
        return this._project.hostArch();
    }
    projectDir(): string {
        return this._project.dir();
    }
    fibsDir(): string {
        return this._project.fibsDir();
    }
    sdkDir(): string {
        return this._project.sdkDir();
    }
    importsDir(): string {
        return this._project.importsDir();
    }
    configDir(configName?: string): string {
        return this._project.configDir(configName);
    }
    buildDir(configName?: string): string {
        return this._project.buildDir(configName);
    }
    distDir(configName?: string): string {
        return this._project.distDir(configName);
    }

    //=== IBuildPhaseInfo
    activeConfig(): Config {
        return this._project.activeConfig();
    }
    platform(): Platform {
        return this._project.platform();
    }
    compiler(): Compiler {
        return this._project.compiler();
    }
    importDir(importName: string): string {
        return this._project.importDir(importName);
    }
    importOptions<T>(name: string, schema: Schema): T {
        return this._project.importOptions(name, schema);
    }
    settings(): Setting[] {
        return this._project.settings();
    }
    configs(): Config[] {
        return this._project.configs();
    }
    commands(): Command[] {
        return this._project.commands();
    }
    imports(): Import[] {
        return this._project.imports();
    }
    tools(): Tool[] {
        return this._project.tools();
    }
    jobs(): JobBuilder[] {
        return this._project.jobs();
    }
    runners(): Runner[] {
        return this._project.runners();
    }
    openers(): Opener[] {
        return this._project.openers();
    }
    findSetting(name: string): Setting | undefined {
        return this._project.findSetting(name);
    }
    findConfig(name: string): Config | undefined {
        return this._project.findConfig(name);
    }
    findCommand(name: string): Command | undefined {
        return this._project.findCommand(name);
    }
    findImport(name: string): Import | undefined {
        return this._project.findImport(name);
    }
    findTool(name: string): Tool | undefined {
        return this._project.findTool(name);
    }
    findRunner(name: string): Runner | undefined {
        return this._project.findRunner(name);
    }
    findOpener(name: string): Opener | undefined {
        return this._project.findOpener(name);
    }
    findImportModule(importName: string, filename?: string): FibsModule | undefined {
        return this._project.findImportModule(importName, filename);
    }
    setting(name: string): Setting {
        return this._project.setting(name);
    }
    config(name: string): Config {
        return this._project.config(name);
    }
    command(name: string): Command {
        return this._project.command(name);
    }
    import(name: string): Import {
        return this._project.import(name);
    }
    tool(name: string): Tool {
        return this._project.tool(name);
    }
    runner(name: string): Runner {
        return this._project.runner(name);
    }
    opener(name: string): Opener {
        return this._project.opener(name);
    }
    importModule(importName: string, filename?: string): FibsModule {
        return this._project.importModule(importName, filename);
    }
    isPlatform(platform: Platform): boolean {
        return this._project.isPlatform(platform);
    }
    isWindows(): boolean {
        return this._project.isWindows();
    }
    isLinux(): boolean {
        return this._project.isLinux();
    }
    isMacOS(): boolean {
        return this._project.isMacOS();
    }
    isIOS(): boolean {
        return this._project.isIOS();
    }
    isAndroid(): boolean {
        return this._project.isAndroid();
    }
    isEmscripten(): boolean {
        return this._project.isEmscripten();
    }
    isWasi(): boolean {
        return this._project.isWasi();
    }
    isWasm(): boolean {
        return this._project.isWasm();
    }
    isHostPlatform(platform: Platform): boolean {
        return this._project.isHostPlatform(platform);
    }
    isHostWindows(): boolean {
        return this._project.isHostWindows();
    }
    isHostLinux(): boolean {
        return this._project.isHostLinux();
    }
    isHostMacOS(): boolean {
        return this._project.isHostMacOS();
    }
    isCompiler(compiler: Compiler): boolean {
        return this._project.isCompiler(compiler);
    }
    isClang(): boolean {
        return this._project.isClang();
    }
    isAppleClang(): boolean {
        return this._project.isAppleClang();
    }
    isMsvc(): boolean {
        return this._project.isMsvc();
    }
    isGcc(): boolean {
        return this._project.isGcc();
    }
}
