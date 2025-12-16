import { log, util } from '../lib/index.ts';
import {
    Adapter,
    Arch,
    ArgOrFunc,
    Builder,
    BuildMode,
    CmakeVariable,
    Command,
    Compiler,
    Config,
    getArg,
    Import,
    JobBuilder,
    Opener,
    Platform,
    Project,
    Runner,
    Setting,
    Target,
    TargetDesc,
    Tool,
} from '../types.ts';

export class BuilderImpl implements Builder {
    _project: Project;
    _targets: TargetDesc[] = [];
    _includeDirectories: string[] = [];
    _compileDefinitions: Record<string, string> = {};
    _compileOptions: string[] = [];
    _linkOptions: string[] = [];

    constructor(project: Project) {
        this._project = project;
    }
    addTarget(arg: ArgOrFunc<TargetDesc>): void {
        const target = getArg(arg);
        if (util.find(target.name, this._targets)) {
            log.panic(`duplicate target: ${target.name}`);
        }
        this._targets.push(target);
    }
    addIncludeDirectory(dir: string): void {
        this._includeDirectories.push(dir);
    }
    addCompileDefinition(key: string, value: string): void {
        this._compileDefinitions[key] = value;
    }
    addCompileOption(opt: string): void {
        this._compileOptions.push(opt);
    }
    addLinkOption(opt: string): void {
        this._linkOptions.push(opt);
    }
    name(): string {
        return this._project.name();
    }
    activeConfig(): Config {
        return this._project.activeConfig();
    }
    platform(): Platform {
        return this._project.platform();
    }
    compiler(): Compiler {
        return this._project.compiler();
    }
    buildMode(): BuildMode {
        return this._project.buildMode();
    }
    hostPlatform(): Platform {
        return this._project.hostPlatform();
    }
    hostArch(): Arch {
        return this._project.hostArch();
    }
    dir(): string {
        return this._project.dir();
    }
    fibsDir(): string {
        return this._project.fibsDir();
    }
    sdkDir(): string {
        return this._project.sdkDir();
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
    importsDir(): string {
        return this._project.importsDir();
    }
    targetBuildDir(targetName: string, configName?: string): string {
        return this._project.targetBuildDir(targetName, configName);
    }
    targetDistDir(targetName: string, configName?: string): string {
        return this._project.targetDistDir(targetName, configName);
    }
    targetAssetsDir(targetName: string, configName?: string): string {
        return this._project.targetAssetsDir(targetName, configName);
    }
    settings(): Setting[] {
        return this._project.settings();
    }
    cmakeVariables(): CmakeVariable[] {
        return this._project.cmakeVariables();
    }
    configs(): Config[] {
        return this._project.configs();
    }
    targets(): Target[] {
        return this._project.targets();
    }
    adapters(): Adapter[] {
        return this._project.adapters();
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
    includeDirectories(): string[] {
        return this._project.includeDirectories();
    }
    compileDefinitions(): Record<string, string> {
        return this._project.compileDefinitions();
    }
    compileOptions(): string[] {
        return this._project.compileOptions();
    }
    linkOptions(): string[] {
        return this._project.linkOptions();
    }
    findSetting(name: string | undefined): Setting | undefined {
        return this._project.findSetting(name);
    }
    setting(name: string): Setting {
        return this._project.setting(name);
    }
    findConfig(name: string | undefined): Config | undefined {
        return this._project.findConfig(name);
    }
    config(name: string): Config {
        return this._project.config(name);
    }
    findTarget(name: string | undefined): Target | undefined {
        return this._project.findTarget(name);
    }
    target(name: string): Target {
        return this._project.target(name);
    }
    findAdapter(name: string | undefined): Adapter | undefined {
        return this._project.findAdapter(name);
    }
    adapter(name: string): Adapter {
        return this._project.adapter(name);
    }
    findCommand(name: string | undefined): Command | undefined {
        return this._project.findCommand(name);
    }
    command(name: string): Command {
        return this._project.command(name);
    }
    findImport(name: string | undefined): Import | undefined {
        return this._project.findImport(name);
    }
    import(name: string): Import {
        return this._project.import(name);
    }
    findTool(name: string | undefined): Tool | undefined {
        return this._project.findTool(name);
    }
    tool(name: string): Tool {
        return this._project.tool(name);
    }
    findRunner(name: string | undefined): Runner | undefined {
        return this._project.findRunner(name);
    }
    runner(name: string): Runner {
        return this._project.runner(name);
    }
    findOpener(name: string | undefined): Opener | undefined {
        return this._project.findOpener(name);
    }
    opener(name: string): Opener {
        return this._project.opener(name);
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
    isBuildMode(buildMode: BuildMode): boolean {
        return this._project.isBuildMode(buildMode);
    }
    isDebug(): boolean {
        return this._project.isDebug();
    }
    isRelease(): boolean {
        return this._project.isRelease();
    }
}
