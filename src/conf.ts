import { Config, Project, ValidateResult } from './types.ts';
import * as util from './util.ts';
import * as log from './log.ts';

export type ValidateOptions = {
    silent?: boolean;
    abortOnError?: boolean;
};

export async function validate(project: Project, config: Config, options: ValidateOptions): Promise<ValidateResult> {
    const {
        silent = false,
        abortOnError = true,
    } = options;
    const res: ValidateResult = { valid: true, hints: [] };

    const configAliasMap = util.buildConfigAliasMap(project, config);

    // run config validator function
    const validateFuncRes = config.validate(project);
    if (!validateFuncRes.valid) {
        res.valid = false;
        res.hints.push(...validateFuncRes.hints);
    }

    // validate generators
    // TODO: more generator checks
    if (config.generator === 'Ninja') {
        if (!await util.find('ninja', project.tools)!.exists()) {
            res.valid = false;
            res.hints.push('ninja build tool not found (run \'fibs diag tools\')');
        }
    } else if (config.generator === 'Unix Makefiles') {
        if (!await util.find('make', project.tools)!.exists()) {
            res.valid = false;
            res.hints.push('make build tool not found (run \'fibs diag tools\')');
        }
    }

    // check if toolchain file exists
    if (config.toolchainFile !== undefined) {
        const toolchainPath = util.resolveAlias(configAliasMap, config.toolchainFile);
        if (!util.fileExists(toolchainPath)) {
            res.valid = false;
            res.hints.push(`toolchain file not found: ${toolchainPath}`);
        }
    }

    if (!res.valid && !silent) {
        const msg = [`config '${config.name} not valid:\n`, ...res.hints].join('\n  ') + '\n';
        if (abortOnError) {
            log.error(msg);
        } else {
            log.warn(msg);
        }
    }
    return res;
}
