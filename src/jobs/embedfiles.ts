import { JobTemplateDesc, Job, JobBuilder, TargetBuildContext, util, log } from '../../mod.ts';

export const embedfilesDesc: JobTemplateDesc = { help, run };

function help() {
    log.helpJob([
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

export function run(args: EmbedFilesArgs): JobBuilder {
    if ((args.dir !== undefined) && !util.isString(args.dir)) {
        log.error(`embedfiles: expected arg 'dir: string' in:\n${args}`);
    }
    if (!util.isStringArray(args.files)) {
        log.error(`embedfiles: expected arg 'files: string[]' in:\n${args}`);
    }
    if (!util.isStringArray(args.outHeader)) {
        log.error(`embedfiles: expected arg 'outHeader: string[]' in:\n${args}`);
    }
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
