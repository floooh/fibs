import {
    CompileDefinitionsDesc,
    CompileOptionsDesc,
    IncludeDirectoriesDesc,
    LinkOptionsDesc,
    TargetBuilder,
    TargetDesc,
    TargetJob,
    TargetType,
    isCompileDefinitionsDesc,
    isIncludeDirectoriesDesc,
    isCompileOptionsDesc,
    isLinkOptionsDesc,
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

    setDir(dir: string): void {
        this.desc.dir = dir;
    }

    addSource(src: string): void {
        this.desc.sources!.push(src);
    }

    addSources(sources: string[]): void {
        this.desc.sources!.push(...sources);
    }

    addDependencies(deps: string[]): void {
        this.desc.deps!.push(...deps);
    }

    addLibraries(libs: string[]): void {
        this.desc.libs!.push(...libs);
    }

    addIncludeDirectories(dirs: IncludeDirectoriesDesc | string[]): void {
        if (isIncludeDirectoriesDesc(dirs)) {
            this.desc.includeDirectories!.push(dirs);
        } else {
            this.desc.includeDirectories!.push({ dirs });
        }
    }

    addCompileDefinitions(defs: CompileDefinitionsDesc | Record<string, string>): void {
        if (isCompileDefinitionsDesc(defs)) {
            this.desc.compileDefinitions!.push(defs);
        } else {
            this.desc.compileDefinitions!.push({ defs });
        }
    }

    addCompileOptions(opts: CompileOptionsDesc | string[]): void {
        if (isCompileOptionsDesc(opts)) {
            this.desc.compileOptions!.push(opts);
        } else {
            this.desc.compileOptions!.push({ opts });
        }
    }

    addLinkOptions(opts: LinkOptionsDesc | string[]): void {
        if (isLinkOptionsDesc(opts)) {
            this.desc.linkOptions!.push(opts);
        } else {
            this.desc.linkOptions!.push({ opts });
        }
    }

    addJob(job: TargetJob): void {
        this.desc.jobs!.push(job);
    }
}
