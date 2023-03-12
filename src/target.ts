import {
    Project,
    TargetType,
    TargetBuildContext,
    TargetItems,
    TargetItemsFunc,
} from './types.ts';
import * as util from './util.ts';

export function asTargetItemsOrFunc(inp: string[] | TargetItemsFunc | undefined, type: TargetType): TargetItems | TargetItemsFunc {
    const res: TargetItems = {
        interface: [],
        private: [],
        public: [],
    };
    if (inp) {
        if (typeof inp === 'function') {
            return inp;
        }
        else if (Array.isArray(inp)) {
            if (type === 'void') {
                res.interface = inp;
            } else {
                res.public = inp;
            }
        }
    }
    return res;
}

export function resolveTargetItems(project: Project, itemsOrFunc: TargetItems | TargetItemsFunc, buildContext: TargetBuildContext): TargetItems {
    let items: TargetItems;
    if (typeof itemsOrFunc === 'function') {
        items = asTargetItemsOrFunc(itemsOrFunc(buildContext), buildContext.target.type) as TargetItems;
    } else {
        items = itemsOrFunc;
    }
    const aliasMap = util.aliasMap(project, buildContext.config, buildContext.target.importDir);
    if (items.interface) {
        items.interface = items.interface.map((item) => util.resolveAlias(item, aliasMap));
    }
    if (items.private) {
        items.private = items.private.map((item) => util.resolveAlias(item, aliasMap));
    }
    if (items.public) {
        items.public = items.public.map((item) => util.resolveAlias(item, aliasMap));
    }
    return items;
}
