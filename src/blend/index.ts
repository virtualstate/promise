import { PushWriter } from "../push";

export interface BlenderTargetFn<T> {
  (value: T): unknown | void | Promise<unknown | void>;
}

export type BlenderTarget<T> = BlenderTargetFn<T> | PushWriter<T>;

export interface BlendedIndexLike {
  source: unknown;
  target: unknown;
}

export interface BlendedIndex extends BlendedIndexLike {
  source: number;
  target: number;
}

export interface BlendOptions<I = BlendedIndex> {
  blended?: I[];
  random?: boolean;
}

export interface Blended extends BlendedIndex {
  promise: Promise<void>;
}

export interface BlenderBlend<I extends BlendedIndexLike = BlendedIndex> {
  blend(options?: BlendOptions<I>): I[];
}

export interface BlenderConnect<
  I extends BlendedIndexLike = BlendedIndex,
  B = Blended
> extends BlenderBlend<I> {
  connect(options?: BlendOptions<I>): B[];
}

export interface Blender<
  T = unknown,
  I extends BlendedIndexLike = BlendedIndex,
  B = Blended
> extends BlenderConnect<I, B> {
  source(source: AsyncIterable<T>, at?: I["source"]): I["source"];
  target(target: BlenderTarget<T>, at?: I["target"]): I["target"];
}

export interface BlenderOptions extends BlendOptions {
  close?: boolean;
}

export function blend<T = unknown>(options?: BlenderOptions): Blender<T> {
  const targets: BlenderTarget<T>[] = [];
  const sources: AsyncIterable<T>[] = [];

  const connected = new WeakSet<object>();

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
      return;
    }
    return writer.throw?.(reason);
  }

  function closeTarget(target: number) {
    if (!options?.close) return;
    const writer = targets[target];
    if (!writer) return;
    if (typeof writer === "function") {
      return;
    }
    if (connected.has(writer)) {
      return;
    }
    return writer.close?.();
  }

  function shouldReconnect(index: number, source: AsyncIterable<T>) {
    return sources[index] !== source;
  }

  async function connect(source: number, targets: number[]): Promise<void> {
    const iterable = sources[source];
    if (!iterable) return;
    if (connected.has(iterable)) return;
    const reconnect = shouldReconnect.bind(undefined, source, iterable);
    try {
      connected.add(iterable);
      for await (const value of iterable) {
        if (reconnect()) break;
        for (const target of targets) {
          pushAtTarget(target, value);
        }
        if (reconnect()) break;
      }
      connected.delete(iterable);
      if (reconnect()) {
        // Swap connection
        return await connect(source, targets);
      }
    } catch (error) {
      connected.delete(iterable);
      for (const target of targets) {
        throwAtTarget(source, error);
      }
      throw await Promise.reject(error);
    } finally {
      connected.delete(iterable);
    }
  }

  function blend(additionalOptions?: BlendOptions) {
    const allOptions = {
      ...options,
      ...additionalOptions,
    };
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
      const targetsRemaining = [...targets.keys()].filter(
        (index) => !usedTargets.has(index)
      );
      const sourcesRemaining = [...sources.keys()].filter(
        (index) => !usedSources.has(index)
      );
      while (targetsRemaining.length && sourcesRemaining.length) {
        const targetsRemainingIndex = Math.max(
          0,
          Math.round(Math.random() * targetsRemaining.length - 1)
        );
        const sourcesRemainingIndex = Math.max(
          0,
          Math.round(Math.random() * sourcesRemaining.length - 1)
        );
        const target = targetsRemaining[targetsRemainingIndex];
        const source = sourcesRemaining[sourcesRemainingIndex];
        result.push({
          target,
          source,
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
      const sources = [
          ...new Set(blended.map(({ source }) => source))
      ];
      let remaining = [...blended];
      function done(finished: BlendedIndex[]) {
        remaining = remaining.filter(value => !finished.includes(value))
        const targets = finished.map(({ target }) => target);
        const closeTargets = targets.filter(target => {
          const index = remaining.findIndex(value => value.target === target);
          return index === -1;
        });
        for (const target of closeTargets) {
          closeTarget(target);
        }
      }
      return sources.flatMap((source): Blended[] => {
        const indexes = blended
            .filter(value => value.source === source);
        const targets = indexes
            .map(({ target }) => target);
        const promise = connect(source, targets).finally(
            () => done(indexes)
        );
        return targets.map(target => ({
          source,
          target,
          promise
        }));
      });
    },
  };
}
