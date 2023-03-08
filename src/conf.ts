import { Config, Project } from './types.ts';
import * as emsdk from './emsdk.ts';
import * as util from './util.ts';
import * as log from './log.ts';

export type ValidateOptions = {
    silent?: boolean,
    abortOnError?: boolean,
};

export type ValidateResult = {
    valid: boolean;
    hints: string[];
};

export async function validate(project: Project, config: Config, options: ValidateOptions): Promise<ValidateResult> {
    const {
        silent = false,
        abortOnError = true,
    } = options;
    const res: ValidateResult = { valid: true, hints: [] };

    // validate generators
    // TODO: more generator checks
    if (config.generator === 'Ninja') {
        if (!await project.tools['ninja'].exists()) {
            res.valid = false;
            res.hints.push("ninja build tool not found (run 'fibs diag tools')");
        }
    } else if (config.generator === 'Unix Makefiles') {
        if (!await project.tools['make'].exists()) {
            res.valid = false;
            res.hints.push("make build tool not found (run 'fibs diag tools')");
        }
    }

    // check platforms vs sdks
    // TODO: check Android
    if (config.platform === 'emscripten') {
        if (!util.dirExists(emsdk.dir(project))) {
            res.valid = false;
            res.hints.push("Emscripten SDK not installed (install with 'fibs emsdk install')");
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
            log.error(msg);
        } else {
            log.warn(msg);
        }
    }
    return res;
}
