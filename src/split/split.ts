import { anAsyncThing, TheAsyncThing } from "../the-thing";
import { Push, PushOptions } from "../push";
import { ok } from "../like";
import { isAsyncIterable } from "../is";
import {
  FilterFn,
  Split,
  Name,
  SplitInput,
  assertSplitInputFn,
  SplitFn,
  SplitInputFn,
} from "./type";

export interface SplitProxyOptions {
  proxy: true;
}

export interface SplitOptions<T>
  extends PushOptions,
    Partial<SplitProxyOptions> {
  name?(value: T): Name;
}

function identity(value: unknown) {
  return value;
}

function createSplitContext<T>(
  input: SplitInput<T>,
  options?: SplitOptions<T>
) {
  const targets: Push<T>[] = [],
    filter = new Map<FilterFn<T>, Push<T[]>>(),
    splits = new Map<FilterFn<T>, Split<T>>(),
    namedFilter = new Map<Name, FilterFn<T>>();

  let mainTarget: Push<T[]> | undefined = undefined;

  let done = false,
    started = false;

  let readPromise: Promise<void> | undefined = undefined;

  function bind(that: unknown, ...args: unknown[]) {
    return function binder(this: unknown, ...more: unknown[]) {
      return call(that, ...args, ...more);
    };
  }

  async function* call(that?: unknown, ...args: unknown[]): AsyncIterable<T[]> {
    if (isAsyncIterable<T[]>(input)) {
      yield* input;
    } else {
      assertSplitInputFn<T[]>(input);
      yield* input.call(that, ...args);
    }
  }

  const source = {
    async *[Symbol.asyncIterator]() {
      yield* call();
    },
  };

  function start() {
    if (readPromise) return readPromise;
    readPromise = read();
    void readPromise.catch((error) => void error);
    return readPromise;
  }

  async function read() {
    try {
      ok(!started);
      started = true;
      for await (const snapshotInput of source) {
        const snapshot = Array.isArray(snapshotInput)
          ? snapshotInput
          : [snapshotInput];
        mainTarget?.push(snapshot);
        for (const [index, value] of Object.entries(snapshot)) {
          targets[+index]?.push(value);
        }
        for (const [fn, target] of filter.entries()) {
          const filtered = snapshot.filter(fn);
          if (!filtered.length) continue;
          target.push(filtered);
        }
      }
      mainTarget?.close();
      for (const target of targets) {
        target.close();
      }
      for (const target of filter.values()) {
        target.close();
      }
    } catch (error) {
      mainTarget?.throw(error);
      for (const target of targets) {
        target.throw(error);
      }
      for (const target of filter.values()) {
        target.throw(error);
      }
    }
    done = true;
  }

  function getAsyncIterableOutput<Z>(target: Push<Z>): AsyncIterable<Z> {
    return {
      async *[Symbol.asyncIterator]() {
        const promise = start();
        yield* target;
        await promise;
      },
    };
  }
  function getOutput<Z>(target: Push<Z>): TheAsyncThing<Z> {
    return anAsyncThing(getAsyncIterableOutput(target));
  }

  function getTargetOutput(index: number) {
    const existing = targets[index];
    if (existing) {
      return getOutput(existing);
    }
    const target = new Push<T>(options);
    targets[index] = target;
    return getOutput(target);
  }

  function getFilterTarget(fn: FilterFn<T>) {
    const existing = filter.get(fn);
    if (existing) {
      return existing;
    }
    const target = new Push<T[]>();
    filter.set(fn, target);
    return target;
  }

  function getFilterTargetOutput(fn: FilterFn<T>) {
    return getOutput(getFilterTarget(fn));
  }
  function getFilterOutput(fn: FilterFn<T>, options?: SplitOptions<T>) {
    const existing = splits.get(fn);
    if (existing) {
      return existing;
    }
    const target = getFilterTargetOutput(fn);
    const output = split(target, options);
    splits.set(fn, output);
    return output;
  }

  function getNamedFilter(name: Name): FilterFn<T> {
    let nameFn = namedFilter.get(name);
    if (!nameFn) {
      const getName = options?.name ?? identity;
      nameFn = (value) => {
        return getName(value) === name;
      };
      namedFilter.set(name, nameFn);
    }
    return nameFn;
  }

  function getNamedFilterTargetOutput(name: Name) {
    const nameFn = getNamedFilter(name);
    return getFilterTargetOutput(nameFn);
  }

  function getNamedFilterOutput(name: Name, options?: SplitOptions<T>) {
    const nameFn = getNamedFilter(name);
    return getFilterOutput(nameFn, options);
  }

  return {
    async *[Symbol.asyncIterator](): AsyncIterableIterator<T[]> {
      mainTarget = mainTarget ?? new Push(options);
      yield* getAsyncIterableOutput(mainTarget);
    },
    [Symbol.iterator]() {
      function* withIndex(index: number): Iterable<TheAsyncThing<T>> {
        yield getTargetOutput(index);
        yield* withIndex(index + 1);
      }
      return withIndex(0)[Symbol.iterator]();
    },
    getFilterTargetOutput,
    getFilterOutput,
    getNamedFilterTargetOutput,
    getNamedFilterOutput,
    source,
    call,
    bind,
  } as const;
}

export function split<T>(
  input: SplitInputFn<T>,
  options?: SplitOptions<T>
): SplitFn<T>;
export function split<T>(
  input: SplitInput<T>,
  options?: SplitOptions<T>
): Split<T>;
export function split<T>(
  input: SplitInput<T>,
  options?: SplitOptions<T>
): Split<T> {
  const context = createSplitContext<T>(input, options);
  if (typeof input === "function") {
    return createFn();
  } else {
    return createInstance();
  }

  function createFn() {
    const fn: unknown = function SplitFn(this: unknown, ...args: unknown[]) {
      return split(context.bind(this, ...args), options);
    };
    defineProperties(fn);
    return fn;

    function defineProperties(fn: unknown): asserts fn is SplitFn<T> {
      assertSplitInputFn(fn);
      Object.defineProperties(fn, {
        [Symbol.asyncIterator]: {
          value: context[Symbol.asyncIterator],
          enumerable: false,
        },
        [Symbol.iterator]: {
          value: context[Symbol.iterator],
          enumerable: false,
        },
        filter: {
          value(fn: FilterFn<T>) {
            return context.getFilterOutput(fn, options);
          },
        },
        named: {
          value(name: Name) {
            return context.getNamedFilterOutput(name, options);
          },
        },
      });
    }
  }

  function createInstance() {
    class SplitAsyncIterable implements Split<T> {
      get [Symbol.asyncIterator]() {
        return context[Symbol.asyncIterator];
      }
      get [Symbol.iterator]() {
        return context[Symbol.iterator];
      }
      filter(fn: FilterFn<T>) {
        return context.getFilterOutput(fn, options);
      }
      named(name: Name) {
        return context.getNamedFilterOutput(name, options);
      }
      call(that: unknown, ...args: unknown[]) {
        return split(
          {
            async *[Symbol.asyncIterator]() {
              yield* context.call(that, ...args);
            },
          },
          options
        );
      }
      bind(that: unknown, ...args: unknown[]) {
        return split(context.bind(that, ...args), options);
      }
    }
    return new SplitAsyncIterable();
  }
}
