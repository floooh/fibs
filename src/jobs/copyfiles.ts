import { fs, path } from '../../deps.ts';
import { JobTemplateDesc, Job, JobBuilder, JobValidateResult, TargetBuildContext, util, log } from '../../mod.ts';

export const copyfilesDesc: JobTemplateDesc = { help, validate, builder };

function help() {
    log.helpJob('copyfiles', [
        { name: 'srcDir?', type: 'string', desc: 'base dir to copy from (default: @targetsources:)' },
        { name: 'dstDir?', type: 'string', desc: 'base dir to copy to (default: @targetassets:)' },
        { name: 'files', type: 'string[]', desc: 'list of files to copy' },
    ], 'copy files from source to destination dir');
}

type CopyFilesArgs = {
    srcDir?: string;
    dstDir?: string;
    files: string[];
};

function validate(args: CopyFilesArgs): JobValidateResult {
    const res = util.validateArgs(args, {
        srcDir: { type: 'string', optional: true },
        dstDir: { type: 'string', optional: true },
        files:  { type: 'string[]', optional: false },
    });
    return {
        valid: res.valid,
        hints: res.hints,
    }
}

function builder(args: CopyFilesArgs): JobBuilder {
    const {
        srcDir = '@targetsources:',
        dstDir = '@targetassets:',
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
