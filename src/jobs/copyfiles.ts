import { fs, path } from '../../deps.ts';
import { JobTemplateDesc, Job, JobBuilder, TargetBuildContext, util, log } from '../../mod.ts';

export const copyfilesDesc: JobTemplateDesc = { help, run };

function help() {
    log.helpJob([
        { name: 'srcDir?', type: 'string', desc: 'base dir to copy from (default: @targetsources)' },
        { name: 'dstDir?', type: 'string', desc: 'base dir to copy to (default: @targetassets)' },
        { name: 'files', type: 'string[]', desc: 'list of files to copy' },
    ], 'copy files from source to destination dir');
}

type CopyFilesArgs = {
    srcDir?: string;
    dstDir?: string;
    files: string[];
};

function run(args: CopyFilesArgs): JobBuilder {
    if ((args.srcDir !== undefined) && !util.isString(args.srcDir)) {
        log.error(`copyfiles: expected arg 'srcDir: string' in:\n${args}`);
    }
    if ((args.dstDir !== undefined) && !util.isString(args.dstDir)) {
        log.error(`copyfiles: expected arg 'dstDir: string' in:\n${args}`);
    }
    if (!util.isStringArray(args.files)) {
        log.error(`copyfiles: expected arg 'files: string[]' in:\n${args}`);
    }
    const {
        srcDir = '@targetsources',
        dstDir = '@targetassets',
        files,
    } = args;
    return (context: TargetBuildContext): Job => {
        const target = context.target;
        const aliasMap = util.buildAliasMap({
            project: context.project,
            config: context.config,
            target: context.target,
            selfDir: target.importDir
        });
        return {
            name: 'copyfiles',
            inputs: files.map((file) => util.resolvePath(aliasMap, srcDir, file)),
            outputs: files.map((file) => util.resolvePath(aliasMap, dstDir, file)),
            addOutputsToTargetSources: false,
            args: { srcDir, dstDir, files },
            func: async (inputs: string[], outputs: string[], args: CopyFilesArgs): Promise<void> => {
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
