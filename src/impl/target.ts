import {
    CompileDefinitionsDesc,
    CompileOptionsDesc,
    IncludeDirectoriesDesc,
    LinkOptionsDesc,
    TargetBuilder,
    TargetDesc,
    TargetJob,
    TargetType,
} from '../types.ts';

export class TargetBuilderImpl implements TargetBuilder {
    desc: TargetDesc;

    constructor(name: string, type: TargetType) {
        this.desc = {
            name,
            type,
            sources: [],
            deps: [],
            libs: [],
            includeDirectories: [],
            compileDefinitions: [],
            compileOptions: [],
            linkOptions: [],
            jobs: [],
        };
    }

    setSourcesDir(dir: string): void {
        this.desc.dir = dir;
    }

    addSource(src: string): void {
        this.desc.sources!.push(src);
    }

    addSources(sources: string[]): void {
        this.desc.sources!.push(...sources);
    }

    addDependency(dep: string): void {
        this.desc.deps!.push(dep);
    }

    addLinkLibrary(lib: string): void {
        this.desc.libs!.push(lib);
    }

    addIncludeDirectories(dirs: IncludeDirectoriesDesc): void {
        this.desc.includeDirectories!.push(dirs);
    }

    addCompileDefinitions(defs: CompileDefinitionsDesc): void {
        this.desc.compileDefinitions!.push(defs);
    }

    addCompileOptions(opts: CompileOptionsDesc): void {
        this.desc.compileOptions!.push(opts);
    }

    addLinkOptions(opts: LinkOptionsDesc): void {
        this.desc.linkOptions!.push(opts);
    }

    addJob(job: TargetJob): void {
        this.desc.jobs!.push(job);
    }
}
