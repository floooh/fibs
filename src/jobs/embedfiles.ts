import { JobItem, JobItemFunc, log, TargetBuildContext, util } from '../../mod.ts';

export type EmbedFilesOptions = {
    dir?: string;
    files: string[];
    outHeader: string;
};

export function embedFiles(options: EmbedFilesOptions): JobItemFunc {
    return (context: TargetBuildContext): JobItem => {
        const target = context.target;
        const aliasMap = util.buildAliasMap({
            project: context.project,
            config: context.config,
            target: context.target,
            selfDir: target.importDir
        });
        return {
            name: 'embedfile',
            inputs: options.files.map((file) => util.resolvePath(aliasMap, options.dir, file)),
            outputs: [util.resolvePath(aliasMap, options.outHeader)],
            addOutputsToTargetSources: false,
            args: options,
            func: async (inputs: string[], outputs: string[], args: EmbedFilesOptions): Promise<void> => {
                if (util.dirty(inputs, outputs)) {
                    log.error('FIXME: embedFiles');
                }
            },
        };
    };
}
