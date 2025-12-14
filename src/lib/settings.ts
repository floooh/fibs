import { Project } from './types.ts';
import * as util from './util.ts';
import * as log from './log.ts';

export function set(project: Project, key: string, value: string) {
    if (validate(project, key, value)) {
        project.settings[key].value = value;
        save(project);
    }
}

export function unset(project: Project, key: string) {
    if (validKey(project, key)) {
        project.settings[key].value = project.settings[key].default;
    }
    save(project);
}

export function get(project: Project, key: string): string | undefined {
    if (validKey(project, key)) {
        return project.settings[key].value;
    } else {
        return undefined;
    }
}

export function getDefault(project: Project, key: string): string | undefined {
    if (validKey(project, key)) {
        return project.settings[key].default;
    } else {
        return undefined;
    }
}

export function load(project: Project) {
    const path = util.fibsDir(project) + '/settings.json';
    let items: Record<string, string> = {};
    if (util.fileExists(path)) {
        try {
            items = JSON.parse(
                Deno.readTextFileSync(path),
            ) as typeof items;
        } catch (err) {
            log.panic(`failed loading settings from '${path}' with: `, err);
        }
    }
    // only accept valid items, otherwise use default
    let hasInvalidKeys = false;
    for (const key in items) {
        const value = items[key];
        if (validate(project, key, value)) {
            project.settings[key].value = value;
        } else {
            hasInvalidKeys = true;
        }
    }
    // if we encountered any invalid keys during loading, fix the saved setting.json right away
    if (hasInvalidKeys) {
        log.warn(
            'invalid settings keys encountered during loading, cleaning up settings.json',
        );
        save(project);
    }
}

export function save(project: Project) {
    const path = util.ensureFibsDir(project) + '/settings.json';
    try {
        const kvp: Record<string, string> = {};
        for (const key in project.settings) {
            kvp[key] = project.settings[key].value;
        }
        Deno.writeTextFileSync(
            path,
            JSON.stringify(kvp, null, '  '),
        );
    } catch (err) {
        log.panic(`failed saving settings to '${path}' with: `, err);
    }
}

export function validKey(project: Project, key: string): boolean {
    if (project.settings[key].default !== undefined) {
        return true;
    } else {
        log.warn(`unknown settings item '${key} (run 'fibs list settings')`);
        return false;
    }
}

export function validate(project: Project, key: string, value: string): boolean {
    if (!validKey(project, key)) {
        return false;
    }
    const res = project.settings[key].validate(project, value);
    if (!res.valid) {
        log.warn(`invalid value '${value}' for settings item '${key}' (${res.hint})`);
        return false;
    }
    return true;
}
