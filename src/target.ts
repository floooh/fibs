import {
    TargetType,
    TargetBuildContext,
    TargetItems,
    TargetItemsFunc,
} from './types.ts';

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

export function resolveTargetItems(itemsOrFunc: TargetItems | TargetItemsFunc, buildContext: TargetBuildContext): TargetItems {
    if (typeof itemsOrFunc === 'function') {
        return asTargetItemsOrFunc(itemsOrFunc(buildContext), buildContext.target.type) as TargetItems;
    } else {
        return itemsOrFunc;
    }
}
