import {Push} from "../push";

export interface BlenderTargetFn<T> {
    (value: T): void | Promise<void>;
}

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

export interface Blender<T> {
    source(source: AsyncIterable<T>): number;
    target(target: Push<T> | BlenderTargetFn<T>): number;
    connect(options?: BlendOptions): Blended[];
}

export interface BlenderOptions extends BlendOptions {

}


export function blend<T>(options?: BlenderOptions): Blender<T> {

    const targets: (Push<T> | BlenderTargetFn<T>)[] = [];
    const sources: AsyncIterable<T>[] = [];

    async function connect(source: AsyncIterable<T>, target: Push<T> | BlenderTargetFn<T>) {
        const fn = typeof target === "function" ? target : (value: T) => target.push(value);
        try {
            for await (const value of source) {
                await fn(value);
            }
        } catch (error) {
            if (typeof target !== "function" && target.throw) {
                target.throw(error);
            }
            throw await Promise.reject(error);
        }
    }

    return {
        source(source) {
            return sources.push(source);
        },
        target(target) {
            return targets.push(target);
        },
        connect(additionalOptions) {
            const allOptions = {
                ...options,
                ...additionalOptions
            }
            const { blended: inputBlend, random } = allOptions;
            const result: Blended[] = [];
            if (inputBlend?.length) {
                for (const blend of inputBlend) {
                    const target = targets[blend.target];
                    const source = sources[blend.source];
                    result.push({
                        ...blend,
                        promise: connect(source, target)
                    });
                }
            }
            if (random !== false) {
                const usedTargets = new Set(result.map(({ target }) => target));
                const usedSources = new Set(result.map(({ source }) => source));
                const targetsRemaining = [...targets.entries()].filter(([index]) => !usedTargets.has(index));
                const sourcesRemaining = [...sources.entries()].filter(([index]) => !usedSources.has(index));
                while (targetsRemaining.length && sourcesRemaining.length) {
                    const targetsRemainingIndex = Math.max(0, Math.round(Math.random() * targetsRemaining.length - 1));
                    const sourcesRemainingIndex = Math.max(0, Math.round(Math.random() * sourcesRemaining.length - 1));
                    const [targetIndex, target] = targetsRemaining[targetsRemainingIndex];
                    const [sourceIndex, source] = sourcesRemaining[sourcesRemainingIndex];
                    result.push({
                        target: targetIndex,
                        source: sourceIndex,
                        promise: connect(source, target)
                    });
                    targetsRemaining.splice(targetsRemainingIndex, 1);
                    sourcesRemaining.splice(sourcesRemainingIndex, 1);
                }
            }
            return result;
        }
    }


}