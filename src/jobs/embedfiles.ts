import { JobTemplateDesc, Job, JobBuilder, JobValidateResult, TargetBuildContext, util, log } from '../../mod.ts';

export const embedfilesDesc: JobTemplateDesc = { help, validate, builder };

function help() {
    log.helpJob('embedfiles', [
        { name: 'dir?', type: 'string', desc: 'base directory of files to embed (default: @targetsources)' },
        { name: 'files', type: 'string[]', desc: 'list of files to embed' },
        { name: 'outHeader', type: 'string', desc: 'path of generated header file' },
    ], 'generate C header with embedded binary file data');
}

type EmbedFilesArgs = {
    dir?: string;
    files: string[];
    outHeader: string;
};

export function validate(args: EmbedFilesArgs): JobValidateResult {
    const res = util.validateArgs(args, {
        dir: { type: 'string', optional: true },
        files: { type: 'string[]', optional: false },
        outHeader: { type: 'string', optional: false },
    })
    return {
        valid: res.valid,
        hints: res.hints
    };
}

export function builder(args: EmbedFilesArgs): JobBuilder {
    const { dir = '@targetsources', files, outHeader } = args;
    return (context: TargetBuildContext): Job => {
        const target = context.target;
        const aliasMap = util.buildAliasMap({
            project: context.project,
            config: context.config,
            target: context.target,
            selfDir: target.importDir
        });
        return {
            name: 'embedfile',
            inputs: files.map((file) => util.resolvePath(aliasMap, dir, file)),
            outputs: [util.resolvePath(aliasMap, outHeader)],
            addOutputsToTargetSources: true,
            args: { dir, files, outHeader },
            func: async (inputs: string[], outputs: string[], args: EmbedFilesArgs): Promise<void> => {
                if (util.dirty(inputs, outputs)) {
                    log.error('FIXME: embedFiles');
                }
            },
        };
    };
}
