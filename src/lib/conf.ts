import { log, util } from './index.ts';
import type { Config, Project } from '../types.ts';

export async function validate(
    project: Project,
    config: Config,
    options: { silent?: boolean; abortOnError?: boolean },
): Promise<{ valid: boolean; hints: string[] }> {
    const {
        silent = false,
        abortOnError = true,
    } = options;
    const res: Awaited<ReturnType<typeof validate>> = { valid: true, hints: [] };

    // run config validator function
    const validateFuncRes = config.validate(project);
    if (!validateFuncRes.valid) {
        res.valid = false;
        res.hints.push(...validateFuncRes.hints);
    }

    // validate generators
    // TODO: more generator checks
    if (config.generator === 'ninja') {
        if (!await project.tool('ninja').exists()) {
            res.valid = false;
            res.hints.push("ninja build tool not found (run 'fibs diag tools')");
        }
    } else if (config.generator === 'make') {
        if (!await project.tool('make').exists()) {
            res.valid = false;
            res.hints.push("make build tool not found (run 'fibs diag tools')");
        }
    }

    // check if toolchain file exists
    if (config.toolchainFile !== undefined) {
        if (!util.fileExists(config.toolchainFile)) {
            res.valid = false;
            res.hints.push(`toolchain file not found: ${config.toolchainFile}`);
        }
    }

    if (!res.valid && !silent) {
        const msg = [`config '${config.name} not valid:\n`, ...res.hints].join('\n  ') + '\n';
        if (abortOnError) {
            log.panic(msg);
        } else {
            log.warn(msg);
        }
    }
    return res;
}
