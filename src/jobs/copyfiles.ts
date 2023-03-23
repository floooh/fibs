import { JobItemFunc, JobItem, TargetBuildContext, util, log } from '../../mod.ts';

export type CopyFilesOptions = {
    srcDir?: string;
    dstDir?: string;
    files: string[];
};

export function copyFiles(options: CopyFilesOptions): JobItemFunc {
    return (context: TargetBuildContext, options: CopyFilesOptions): JobItem => {
        const target = context.target;
        const aliasMap = util.buildAliasMap(context.project, context.config, target.importDir);
        const srcDir = util.resolvePath(aliasMap, target.importDir, target.dir, options.srcDir);
        return {
            inputs: options.files.map((file) => `${srcDir}/${file}`),
            // FIXME: mutate outputs based on platform and target type (macOS vs iOS bundle?)
            outputs: options.files.map((file) => util.resolvePath(aliasMap, '@dist', options.dstDir, file)),
            args: options,
            func: (input: string[], outputs: string[], options: CopyFilesOptions): boolean => {
                log.error('FIXME: copyFiles');
            }
        };
    };
}
