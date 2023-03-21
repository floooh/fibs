import { JobItemFunc, JobItem, TargetBuildContext, log, util } from '../../mod.ts';

export type CopyFilesOptions = {
    dir?: string;
    files: string[];
};

export function copyFiles(options: CopyFilesOptions): JobItemFunc {
    return (context: TargetBuildContext, options: CopyFilesOptions): JobItem => {
        const target = context.target;
        const srcDir = util.resolveDirPath(target.importDir, target.dir, options.dir);
        return {
            inputs: options.files.map((file) => `${srcDir}/${file}`),
            // FIXME: mutate outputs based on platform and target type (macOS vs iOS bundle?)
            outputs: options.files.map((file) => `@dist/${file}`),
            args: options,
            func: (input: string[], outputs: string[], options: CopyFilesOptions): boolean => {
                log.error('FIXME: copyFiles');
            }
        };
    };
}
