import { Project } from './types.ts';
import * as util from './util.ts';
import * as log from './log.ts';

export function set(project: Project, key: string, value: string) {
    if (validKey(project, key)) {
        project.settings.items[key] = structuredClone(value);
        save(project);
    }
}

export function unset(project: Project, key: string) {
    if (validKey(project, key)) {
        project.settings.items[key] = structuredClone(project.settings.defaults[key]);
    }
    save(project);
}

export function get(project: Project, key: string): string | undefined {
    if (validKey(project, key)) {
        return structuredClone(project.settings.items[key]);
    } else {
        return undefined;
    }
}

export function getDefault(project: Project, key: string): string | undefined {
    if (validKey(project, key)) {
        return structuredClone(project.settings.defaults[key]);
    } else {
        return undefined;
    }
}

export function load(project: Project) {
    project.settings.items = structuredClone(project.settings.defaults);
    const path = util.fibsDir(project) + '/settings.json';
    let items: typeof project.settings.items = {};
    if (util.fileExists(path)) {
        try {
            items = JSON.parse(Deno.readTextFileSync(path)) as typeof project.settings.items;
        } catch (err) {
            log.error(`failed loading settings from '${path}' with: ${err.message}`);
        }
    }
    // only take items with known keys and matching types
    let hasInvalidKeys = false;
    for (const key in items) {
        const value = items[key];
        if (validKey(project, key)) {
            project.settings.items[key] = value;
        } else {
            hasInvalidKeys = true;
        }
    }
    // if we encountered any invalid keys during loading, fix the saved setting.json right away
    if (hasInvalidKeys) {
        log.warn('invalid settings keys encountered during loading, cleaning up settings.json');
        save(project);
    }
}

export function save(project: Project) {
    const path = util.ensureFibsDir(project) + '/settings.json';
    try {
        Deno.writeTextFileSync(path, JSON.stringify(project.settings.items, null, '  '));
    } catch (err) {
        log.error(`failed saving settings to '${path}' with: ${err.message}`);
    }
}

export function validKey(project: Project, key: string) {
    if (project.settings.defaults[key] !== undefined) {
        return true;
    } else {
        log.warn(`ignoring unknown settings item '${key}' (run 'fibs list settings)`);
        return false;
    }
}
