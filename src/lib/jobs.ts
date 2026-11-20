import { host, log, util } from './index.ts';
import { assertFibsModule, type Config, type JobCommandTarget, type Project, type ResolvedJob, type Target } from '../types.ts';
import { ConfigurerImpl } from '../impl/configurerimpl.ts';
import { colors, path } from '../deps.ts';

/**
 * A job in the build plan. Identical jobs of different targets are merged
 * into one planned job which is owned by the first target using the job.
 */
export type PlannedJob = {
    job: ResolvedJob;
    /** the target which owns the job's build rule */
    owner: Target;
    /** path of the job file (only for script jobs) */
    jobFile?: string;
};

export type JobPlan = {
    jobs: PlannedJob[];
    /** target name => all planned jobs used by the target (owned and shared) */
    targetJobs: Map<string, PlannedJob[]>;
    /** output path => job which produces the output */
    producers: Map<string, PlannedJob>;
};

/** content of a script job file, read by 'fibs runjob' at build time */
type JobFile = {
    rootDir: string;
    importDir: string;
    modulePath: string;
    job: string;
    inputs: string[];
    outputs: string[];
    args: unknown;
};

/**
 * Merge identical jobs, find the producer of each job output and check for
 * conflicting outputs and dependency cycles between jobs.
 *
 * @param project the Project object
 * @param config the active build config
 * @returns the job plan
 * @throws if different jobs produce the same output, or jobs have cyclic dependencies
 */
export function planJobs(project: Project, config: Config): JobPlan {
    const plan: JobPlan = { jobs: [], targetJobs: new Map(), producers: new Map() };
    const byKey = new Map<string, PlannedJob>();
    for (const target of project.targets()) {
        const targetJobs: PlannedJob[] = [];
        target.resolvedJobs.forEach((job, index) => {
            const key = jobKey(job);
            let planned = byKey.get(key);
            if (planned === undefined) {
                planned = { job, owner: target };
                if (job.commands === undefined) {
                    planned.jobFile = `${project.buildDir(config.name)}/jobs/${target.name}/${index}-${job.name}.json`;
                }
                for (const output of job.outputs) {
                    plan.producers.set(output, planned);
                }
                byKey.set(key, planned);
                plan.jobs.push(planned);
            }
            if (!targetJobs.includes(planned)) {
                targetJobs.push(planned);
            }
        });
        if (targetJobs.length > 0) {
            plan.targetJobs.set(target.name, targetJobs);
        }
    }
    const [collision] = findOutputCollisions(plan.jobs);
    if (collision !== undefined) {
        throw new Error(outputCollisionMessage(collision));
    }
    checkCycles(plan);
    return plan;
}

/** identical jobs in different targets have the same key and are merged */
function jobKey(job: ResolvedJob): string {
    return JSON.stringify([job.builder.modulePath, job.name, job.inputs, job.outputs, job.commands, job.args]);
}

type OutputCollision = {
    output: string;
    first: PlannedJob;
    second: PlannedJob;
};

/**
 * Find outputs which are produced by different jobs, the optional mapPath()
 * function maps paths to a simulated directory layout (identical jobs after
 * mapping are merged).
 */
function findOutputCollisions(jobs: PlannedJob[], mapPath = (s: string) => s): OutputCollision[] {
    const res: OutputCollision[] = [];
    const keys = new Set<string>();
    const producers = new Map<string, PlannedJob>();
    for (const planned of jobs) {
        const key = mapPath(jobKey(planned.job));
        if (keys.has(key)) {
            continue;
        }
        keys.add(key);
        for (const output of planned.job.outputs.map(mapPath)) {
            const first = producers.get(output);
            if (first !== undefined) {
                res.push({ output, first, second: planned });
            } else {
                producers.set(output, planned);
            }
        }
    }
    return res;
}

function outputCollisionMessage({ output, first, second }: OutputCollision): string {
    const file = colors.brightBlue(path.basename(output));
    const fmt = (p: PlannedJob) => `job '${colors.magenta(p.job.name)}' in target '${colors.blue(p.owner.name)}'`;
    return `job output file collision:\n\n` +
        `  ${fmt(first)}\n` +
        `  ${fmt(second)}\n` +
        `  both produce output file '${file}'\n\n` +
        `${colors.cyan('hint:')} identical jobs in different targets are merged into one\n` +
        `${colors.green('solution:')} split the jobs so that '${file}' is produced by an identical job in each target`;
}

/**
 * Some targets have their own assets and dist directories (e.g. app bundles
 * on macOS and iOS), while on other platforms they share the same dist
 * directory with all other targets. Simulate the shared layout to warn about
 * job output collisions which would only happen on other platforms.
 *
 * @param project the Project object
 * @param config the active build config
 * @param plan the job plan
 */
export function checkSharedDirCollisions(project: Project, config: Config, plan: JobPlan) {
    const sharedDir = util.distDir(project.dir(), config.name);
    const targetDirs = project.targets().flatMap((t) => [
        project.targetAssetsDir(t.name, config.name),
        project.targetDistDir(t.name, config.name),
    ]);
    // longest first so that '.../foo.app/Contents/Resources' is replaced before '.../foo.app' (iOS)
    const privateDirs = [...new Set(targetDirs)].filter((dir) => dir !== sharedDir).sort((a, b) => b.length - a.length);
    if (privateDirs.length === 0) {
        return;
    }
    const unbundle = (s: string) => privateDirs.reduce((str, dir) => str.replaceAll(dir, sharedDir), s);
    for (const collision of findOutputCollisions(plan.jobs, unbundle)) {
        log.warn(outputCollisionMessage(collision));
    }
}

function checkCycles(plan: JobPlan) {
    const done = new Set<PlannedJob>();
    const visiting: PlannedJob[] = [];
    const visit = (planned: PlannedJob) => {
        if (done.has(planned)) {
            return;
        }
        if (visiting.includes(planned)) {
            const cycle = [...visiting.slice(visiting.indexOf(planned)), planned];
            const fmt = (p: PlannedJob) => `${p.owner.name}:${p.job.name} (${path.basename(p.job.outputs[0] ?? '')})`;
            throw new Error(`cyclic job dependencies: ${cycle.map(fmt).join(' => ')}`);
        }
        visiting.push(planned);
        for (const input of planned.job.inputs) {
            const producer = plan.producers.get(input);
            if (producer !== undefined) {
                visit(producer);
            }
        }
        visiting.pop();
        done.add(planned);
    };
    plan.jobs.forEach(visit);
}

/**
 * Returns the targets referenced in a job's command lines.
 */
export function commandTargets(job: ResolvedJob): string[] {
    const targets = (job.commands ?? []).flatMap((cmd) =>
        cmd.filter((arg): arg is JobCommandTarget => typeof arg === 'object').map((arg) => arg.target)
    );
    return [...new Set(targets)];
}

/**
 * Check that jobs have commands or a run() function, that job inputs exist
 * (or are produced by other jobs), and that targets referenced in job
 * commands are executables which can run on the host platform.
 *
 * @param project the Project object
 * @param config the active build config
 * @param plan the job plan
 * @throws if validation fails
 */
export function validateJobs(project: Project, config: Config, plan: JobPlan) {
    for (const { job, owner } of plan.jobs) {
        const where = `job '${job.name}' in target '${owner.name}'`;
        if ((job.commands === undefined) && (job.builder.run === undefined)) {
            throw new Error(`${where} must either have commands or a run() function (old-style jobs with 'func' are no longer supported)`);
        }
        for (const input of job.inputs) {
            if (!plan.producers.has(input) && !util.fileExists(input) && !util.dirExists(input)) {
                throw new Error(`input '${input}' of ${where} doesn't exist and isn't produced by another job`);
            }
        }
        for (const targetName of commandTargets(job)) {
            const target = project.findTarget(targetName);
            if (target === undefined) {
                throw new Error(`${where} references unknown target '${targetName}'`);
            }
            if ((target.type !== 'plain-exe') && (target.type !== 'windowed-exe')) {
                throw new Error(`${where} references target '${targetName}' which is not an executable`);
            }
            if (config.platform !== host.platform()) {
                throw new Error(`${where} runs target '${targetName}' which can't run on the host when cross-compiling`);
            }
        }
    }
}

/**
 * Write job files for script jobs, files are only written when
 * their content changes (since job files are job dependencies).
 *
 * @param project the Project object
 * @param plan the job plan
 */
export function writeJobFiles(project: Project, plan: JobPlan) {
    for (const { job, jobFile } of plan.jobs) {
        if (jobFile === undefined) {
            continue;
        }
        const content: JobFile = {
            rootDir: project.dir(),
            importDir: job.builder.importDir,
            modulePath: job.builder.modulePath,
            job: job.name,
            inputs: job.inputs,
            outputs: job.outputs,
            args: job.args,
        };
        const str = JSON.stringify(content, null, 2);
        if (!util.fileExists(jobFile) || (Deno.readTextFileSync(jobFile) !== str)) {
            util.ensureDir(path.dirname(jobFile));
            Deno.writeTextFileSync(jobFile, str);
        }
    }
}

/**
 * Run a script job from a job file. This only imports the fibs module
 * which defines the job, not the entire project.
 *
 * @param jobFile path to a job file
 * @throws if the job doesn't exist or fails
 */
export async function runJobFile(jobFile: string) {
    const desc = JSON.parse(Deno.readTextFileSync(jobFile)) as JobFile;
    // NOTE: don't use a template string literal in import(), 'deno publish' would
    // rewrite it into a path relative to this module, which breaks when running from JSR
    const importPath = `file://${desc.modulePath}`;
    const module = await import(importPath);
    assertFibsModule(module);
    const configurer = new ConfigurerImpl(desc.rootDir, desc.importDir, desc.modulePath);
    if (module.configure) {
        module.configure(configurer);
    }
    const jobBuilder = util.find(desc.job, configurer._jobs);
    if (jobBuilder?.run === undefined) {
        throw new Error(`no script job '${desc.job}' found in ${desc.modulePath}`);
    }
    for (const output of desc.outputs) {
        util.ensureDir(path.dirname(output));
    }
    try {
        await jobBuilder.run(desc.inputs, desc.outputs, desc.args);
    } catch (err) {
        throw new Error(`job '${desc.job}' failed (job file: ${jobFile})`, { cause: err });
    }
}
