import { fs, path } from '../../deps.ts';
import { JobItem, JobItemFunc, log, TargetBuildContext, util } from '../../mod.ts';

export type CopyFilesOptions = {
    srcDir?: string;
    dstDir?: string;
    files: string[];
};

export function copyFiles(options: CopyFilesOptions): JobItemFunc {
    return (context: TargetBuildContext): JobItem => {
        const target = context.target;
        const aliasMap = util.buildAliasMap({
            project: context.project,
            config: context.config,
            target: context.target,
            selfDir: target.importDir
        });
        return {
            name: 'copyfiles',
            inputs: options.files.map((file) => util.resolvePath(aliasMap, options.srcDir, file)),
            outputs: options.files.map((file) => util.resolvePath(aliasMap, options.dstDir, file)),
            addOutputsToTargetSources: false,
            args: options,
            func: async (inputs: string[], outputs: string[], options: CopyFilesOptions): Promise<void> => {
                if (util.dirty(inputs, outputs)) {
                    for (let i = 0; i < inputs.length; i++) {
                        const from = inputs[i];
                        const to = outputs[i];
                        log.info(`# cp ${from} ${to}`);
                        fs.ensureDirSync(path.dirname(to));
                        fs.copySync(from, to, { overwrite: true });
                    }
                }
            },
        };
    };
}
