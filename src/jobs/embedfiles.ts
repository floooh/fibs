import { JobItem, JobItemFunc, log, TargetBuildContext, util } from '../../mod.ts';

export type EmbedFilesOptions = {
    dir?: string;
    files: string[];
    outHeader: string;
};

export function embedFiles(options: EmbedFilesOptions): JobItemFunc {
    return (context: TargetBuildContext): JobItem => {
        const target = context.target;
        const aliasMap = util.buildAliasMap(context.project, context.config, target.importDir);
        const srcDir = util.resolvePath(aliasMap, target.importDir, target.dir, options.dir);
        return {
            inputs: options.files.map((file) => `${srcDir}/${file}`),
            outputs: [options.outHeader],
            addOutputsToTargetSources: false,
            args: options,
            func: (inputs: string[], output: string[], args: EmbedFilesOptions): Promise<boolean> => {
                log.error('FIXME: embedFiles');
            },
        };
    };
}
