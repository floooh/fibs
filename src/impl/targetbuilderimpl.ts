import {
    type CompileDefinitionsDesc,
    type CompileOptionsDesc,
    type IncludeDirectoriesDesc,
    isCompileDefinitionsDesc,
    isCompileOptionsDesc,
    isIncludeDirectoriesDesc,
    isLinkOptionsDesc,
    type LinkOptionsDesc,
    type TargetBuilder,
    type TargetDesc,
    type TargetJob,
    type TargetType,
} from '../types.ts';
import type { ProjectImpl } from './projectimpl.ts';
import { util } from '../lib/index.ts';

export class TargetBuilderImpl implements TargetBuilder {
    _project: ProjectImpl;
    _desc: TargetDesc;

    constructor(project: ProjectImpl, name: string, type: TargetType) {
        this._project = project;
        this._desc = {
            name,
            type,
            sources: [],
            deps: [],
            libs: [],
            frameworks: [],
            props: {},
            includeDirectories: [],
            compileDefinitions: [],
            compileOptions: [],
            linkOptions: [],
            jobs: [],
        };
    }

    name(): string {
        return this._desc.name;
    }
    type(): TargetType {
        return this._desc.type;
    }
    buildDir(configName?: string): string {
        if (configName === undefined) {
            configName = this._project.activeConfig().name;
        }
        return util.targetBuildDir(this._project._rootDir, configName, this._desc.name);
    }
    distDir(configName?: string): string {
        const config = (configName === undefined) ? this._project.activeConfig() : this._project.config(configName);
        return util.targetDistDir(this._project._rootDir, config.name, this._desc.name, config.platform, this._desc.type);
    }
    assetsDir(configName?: string): string {
        const config = (configName === undefined) ? this._project.activeConfig() : this._project.config(configName);
        return util.targetAssetsDir(this._project._rootDir, config.name, this._desc.name, config.platform, this._desc.type);
    }

    setDir(dir: string): void {
        this._desc.dir = dir;
    }
    setIdeFolder(folder: string): void {
        this._desc.ideFolder = folder;
    }
    addSource(src: string): void {
        this._desc.sources!.push(src);
    }
    addSources(sources: string[]): void {
        this._desc.sources!.push(...sources);
    }
    addDependencies(deps: string[]): void {
        this._desc.deps!.push(...deps);
    }
    addLibraries(libs: string[]): void {
        this._desc.libs!.push(...libs);
    }
    addFrameworks(frameworks: string[]): void {
        this._desc.frameworks!.push(...frameworks);
    }
    addProperties(props: Record<string, string>): void {
        Object.entries(props).map(([key, val]) => this._desc.props![key] = val);
    }
    addIncludeDirectories(dirs: IncludeDirectoriesDesc | string[]): void {
        if (isIncludeDirectoriesDesc(dirs)) {
            this._desc.includeDirectories!.push(dirs);
        } else {
            this._desc.includeDirectories!.push({ dirs });
        }
    }
    addCompileDefinitions(defs: CompileDefinitionsDesc | Record<string, string>): void {
        if (isCompileDefinitionsDesc(defs)) {
            this._desc.compileDefinitions!.push(defs);
        } else {
            this._desc.compileDefinitions!.push({ defs });
        }
    }
    addCompileOptions(opts: CompileOptionsDesc | string[]): void {
        if (isCompileOptionsDesc(opts)) {
            this._desc.compileOptions!.push(opts);
        } else {
            this._desc.compileOptions!.push({ opts });
        }
    }
    addLinkOptions(opts: LinkOptionsDesc | string[]): void {
        if (isLinkOptionsDesc(opts)) {
            this._desc.linkOptions!.push(opts);
        } else {
            this._desc.linkOptions!.push({ opts });
        }
    }
    addJob(job: TargetJob): void {
        this._desc.jobs!.push(job);
    }
}
