import {PushWriter} from "../push";

export interface BlenderTargetFn<T> {
    (value: T): unknown | void | Promise<unknown | void>;
}

export type BlenderTarget<T> = BlenderTargetFn<T> | PushWriter<T>;

export interface BlendedIndex {
    source: number;
    target: number;
}

export interface BlendOptions {
    blended?: BlendedIndex[];
    random?: boolean;
}

export interface Blended extends BlendedIndex {
    promise: Promise<void>;
}

export interface BlenderConnect {
    connect(options?: BlendOptions): Blended[];
}

export interface BlenderBlend {
    blend(options?: BlendOptions): BlendedIndex[];
}

export interface Blender<T = unknown> extends BlenderConnect, BlenderBlend {
    source(source: AsyncIterable<T>, at?: number): number;
    target(target: BlenderTarget<T>, at?: number): number;
}

export interface BlenderOptions extends BlendOptions {
    close?: boolean;
}

export function blend<T = unknown>(options?: BlenderOptions): Blender<T> {

    const targets: BlenderTarget<T>[] = [];
    const sources: AsyncIterable<T>[] = [];

    function pushAtTarget(target: number, value: T) {
        const writer = targets[target];
        if (!writer) return;
        if (typeof writer === "function") {
            return writer(value);
        }
        return writer.push(value);
    }

    function throwAtTarget(target: number, reason: T) {
        const writer = targets[target];
        if (!writer) return;
        if (typeof writer === "function") {
            return
        }
        return writer.throw?.(reason);
    }

    function closeTarget(target: number) {
        if (!options?.close) return;
        const writer = targets[target];
        if (!writer) return;
        if (typeof writer === "function") {
            return
        }
        return writer.close?.();
    }

    function shouldReconnect(index: number, source: AsyncIterable<T>) {
        return sources[index] !== source;
    }

    async function connect(source: number, target: number): Promise<void> {
        const iterable = sources[source];
        if (!iterable) return;
        const reconnect = shouldReconnect.bind(undefined, source, iterable);
        try {
            for await (const value of iterable) {
                if (reconnect()) break;
                await pushAtTarget(target, value);
                if (reconnect()) break;
            }
            if (reconnect()) {
                // Swap connection
                return await connect(source, target);
            }
        } catch (error) {
            throwAtTarget(target, error);
            throw await Promise.reject(error);
        } finally {
            closeTarget(target);
        }
    }

    function blend(additionalOptions?: BlendOptions) {
        const allOptions = {
            ...options,
            ...additionalOptions
        }
        const { blended: inputBlend, random } = allOptions;
        const result: BlendedIndex[] = [];
        if (inputBlend?.length) {
            for (const blend of inputBlend) {
                result.push(blend);
            }
        }
        if (random) {
            const usedTargets = new Set(result.map(({ target }) => target));
            const usedSources = new Set(result.map(({ source }) => source));
            const targetsRemaining = [...targets.keys()].filter((index) => !usedTargets.has(index));
            const sourcesRemaining = [...sources.keys()].filter((index) => !usedSources.has(index));
            while (targetsRemaining.length && sourcesRemaining.length) {
                const targetsRemainingIndex = Math.max(0, Math.round(Math.random() * targetsRemaining.length - 1));
                const sourcesRemainingIndex = Math.max(0, Math.round(Math.random() * sourcesRemaining.length - 1));
                const target = targetsRemaining[targetsRemainingIndex];
                const source = sourcesRemaining[sourcesRemainingIndex];
                result.push({
                    target,
                    source
                });
                targetsRemaining.splice(targetsRemainingIndex, 1);
                sourcesRemaining.splice(sourcesRemainingIndex, 1);
            }
        }
        return result;
    }

    return {
        source(source, at) {
            if (typeof at === "number") {
                sources[at] = source;
                return at;
            }
            return sources.push(source) - 1;
        },
        target(target, at) {
            if (typeof at === "number") {
                targets[at] = target;
                return at;
            }
            return targets.push(target) - 1;
        },
        blend,
        connect(additionalOptions) {
            const blended = blend(additionalOptions);
            return blended.map(({ source, target }): Blended => ({
                source,
                target,
                promise: connect(source, target)
            }));
        }
    }


}