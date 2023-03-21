import { JobItem, JobItemFunc, TargetBuildContext, log, util } from '../../mod.ts';

export type EmbedFilesOptions = {
    dir?: string;
    files: string[];
    outHeader: string;
};

export function embedFiles(options: EmbedFilesOptions): JobItemFunc {
    return (context: TargetBuildContext, options: EmbedFilesOptions): JobItem => {
        const target = context.target;
        const srcDir = util.resolveDirPath(target.importDir, target.dir, options.dir);
        return {
            inputs: options.files.map((file) => `${srcDir}/${file}`),
            outputs: [ options.outHeader ],
            args: options,
            func: (inputs: string[], output: string[], args: EmbedFilesOptions): boolean => {
                log.error('FIXME: embedFiles');
            },
        }
    }
}
