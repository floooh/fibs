import { log, util } from './index.ts';
import { Project, Setting } from '../types.ts';

function setting(project: Project, key: string): Setting {
    const s = util.find(key, project.settings);
    if (s === undefined) {
        log.panic(`Unknown setting key: ${key}`);
    }
    return s;
}

export function set(project: Project, key: string, value: string) {
    setting(project, key).value = value;
    save(project);
}

export function unset(project: Project, key: string) {
    const s = setting(project, key);
    s.value = s.default;
    save(project);
}

export function get(project: Project, key: string): string {
    return setting(project, key).value;
}

export function getDefault(project: Project, key: string): string {
    return setting(project, key).default;
}

export function load(project: Project) {
    const path = project.fibsDir() + '/settings.json';
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
            set(project, key, value);
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
        for (const s of project.settings) {
            kvp[s.name] = s.value;
        }
        Deno.writeTextFileSync(
            path,
            JSON.stringify(kvp, null, '  '),
        );
    } catch (err) {
        log.panic(`failed saving settings to '${path}' with: `, err);
    }
}

export function validate(project: Project, key: string, value: string): boolean {
    const s = util.find(key, project.settings);
    if (s === undefined) {
        log.warn(`unknown settings item '${key} (run 'fibs list settings')`);
        return false;
    }
    const res = s.validate(project, value);
    if (!res.valid) {
        log.warn(`invalid value '${value}' for settings item '${key}' (${res.hint})`);
        return false;
    }
    return true;
}
