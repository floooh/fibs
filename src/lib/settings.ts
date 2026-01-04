import { log, util } from './index.ts';
import type { Project } from '../types.ts';

/**
 * Set settings key/value pair on Project and save updated settings
 * to file system.
 *
 * @param project the Project object to update settings on
 * @param key the setting key string
 * @param value the setting value string
 */
export function set(project: Project, key: string, value: string) {
    project.setting(key).value = value;
    save(project);
}

/**
 * Removes a settings key from Project and save updated settings
 * to filesystem.
 *
 * @param project the Project object to remove the setting from
 * @param key the settings key string
 */
export function unset(project: Project, key: string) {
    const s = project.setting(key);
    s.value = s.default;
    save(project);
}

/**
 * Obtain the value of a setting, throws if setting doesn't exist.
 *
 * @param project the Project object to obtain the setting from
 * @param key the settings key string
 * @returns setting value
 * @throws if setting doesn't exist
 */
export function get(project: Project, key: string): string {
    return project.setting(key).value;
}

/**
 * Get the default value of a setting or throw if setting doesn't
 * exist.
 * @param project the Project object to obtain the setting from
 * @param key the settings key string
 * @returns the setting's default value
 * @throws if sertting doesn't exist
 */
export function getDefault(project: Project, key: string): string {
    return project.setting(key).default;
}

/**
 * Load settings from filesystem into Project object. Settings are
 * stored in `.fibs/settings.json'. If the loaded settings contain
 * unknown/obsolete keys, the invalid keys will be removed and
 * the cleaned up settings saved back to the file system.
 *
 * @param project the Project object to load settings into
 */
export function load(project: Project) {
    const path = project.fibsDir() + '/settings.json';
    let items: Record<string, string> = {};
    if (util.fileExists(path)) {
        try {
            items = JSON.parse(
                Deno.readTextFileSync(path),
            ) as typeof items;
        } catch (err) {
            throw new Error(`failed loading settings from '${path}'`, { cause: err });
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
    const path = `${util.ensureDir(project.fibsDir())}/settings.json`;
    try {
        const kvp: Record<string, string> = {};
        for (const s of project.settings()) {
            kvp[s.name] = s.value;
        }
        Deno.writeTextFileSync(
            path,
            JSON.stringify(kvp, null, '  '),
        );
    } catch (err) {
        throw new Error(`failed saving settings to '${path}'`, { cause: err });
    }
}

export function validate(project: Project, key: string, value: string): boolean {
    const s = project.findSetting(key);
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
