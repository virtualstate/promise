import { anAsyncThing, TheAsyncThing } from "../the-thing";
import { Push, PushOptions } from "../push";
import { isLike, no, ok } from "../like";
import {
  isAsyncIterable,
  isIterable,
  isIteratorYieldResult,
  isPromise,
} from "../is";
import {
  FilterFn,
  Split as SplitCore,
  Name,
  SplitInput,
  assertSplitInputFn,
  SplitFn,
  SplitInputFn,
  SplitAsyncIterable,
  isSplitAt,
  MapFn,
  SplitOptions,
  SplitAssertFn,
  TypedSplitOptions,
  SplitConcatInput,
  SplitConcatSyncInput,
  AsyncMap,
} from "./type";
import { union } from "@virtualstate/union";

export function split<T>(
  input: SplitInputFn<unknown>,
  options: TypedSplitOptions<T>
): SplitFn<T>;
export function split<T>(
  input: SplitInput<unknown>,
  options: TypedSplitOptions<T>
): SplitCore<T>;
export function split<T>(
  input: SplitInputFn<T>,
  options?: SplitOptions
): SplitFn<T>;
export function split<T>(
  input: SplitInput<T>,
  options?: SplitOptions
): SplitCore<T>;
export function split<T>(
  input: SplitInput<T>,
  options?: SplitOptions
): SplitCore<T> {
  function assert(value: unknown): asserts value is T {
    if (!isLike<TypedSplitOptions<T>>(options)) return;
    if ("assert" in options) {
      const fn: SplitAssertFn<T> = options.assert;
      return fn(value);
    }
    if ("is" in options) {
      ok(options.is(value));
    }
  }

  const context = createSplitContext<T>(input, options);
  const async = anAsyncThing(context);

  if (typeof input === "function") {
    return createFn();
  } else {
    return createInstance();
  }

  function createSplitContext<T>(
    input: SplitInput<T>,
    options?: SplitOptions
  ): SplitAsyncIterable<T> {
    const targets = new Map<number, Push<T>>();
    let mainTarget: Push<T[]> | undefined = undefined;

    const { empty } = options ?? {};

    let done = false,
      started = false;

    let readPromise: Promise<void> | undefined = undefined;

    function getMainTarget() {
      return (mainTarget = mainTarget ?? new Push(options));
    }

    function bind(that: unknown, ...args: unknown[]) {
      return function binder(this: unknown, ...more: unknown[]) {
        return call(that, ...args, ...more);
      };
    }

    function* check<M = T>(snapshot: M[]): Iterable<M[]> {
      if (!empty && snapshot.length === 0) {
        return;
      }
      yield snapshot;
    }

    function call(that?: unknown, ...args: unknown[]): AsyncIterable<T[]> {
      return {
        [Symbol.asyncIterator]: asSnapshot,
      };

      async function* asSnapshot() {
        if (options?.keep && !mainTarget) {
          void getMainTarget();
        }
        let yielded = false;
        for await (const snapshot of innerCall()) {
          for (const output of check(
            Array.isArray(snapshot)
              ? snapshot
              : isIterable(snapshot)
              ? Array.from(snapshot)
              : [snapshot]
          )) {
            if (options?.keep) {
              for (const index of output.keys()) {
                // Ensure that the target is loaded before we start yielding
                // in our core
                //
                // Only do this if keep is indicated, this allows for the entire
                // source to be read at any point.
                //
                // keep when used with push allows the async iterables
                // to be read multiple times over as well!
                void atTarget(index);
              }
            }
            yield output;
            yielded = true;
          }
        }
        if (!yielded) {
          // Yield an empty result so that when we use a promise
          // we get a consistent result, never giving an undefined default
          //
          // This also means we get _at least one_ yield always through the main
          // target
          //
          // The push function will push this to mainTarget but to none of the
          // indexed targets
          yield [];
        }
      }

      async function* innerCall() {
        if (isAsyncIterable<T[]>(input)) {
          yield* input;
        } else {
          assertSplitInputFn<T[]>(input);
          yield* input.call(that, ...args);
        }
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

    async function close() {
      if (done) return;
      done = true;
      const promises = [...inner()].filter(Boolean);
      if (promises.length) {
        await Promise.any(promises);
      }

      function* inner() {
        if (mainTarget) {
          yield mainTarget.close();
        }
        for (const target of targets.values()) {
          if (!target) continue;
          yield target.close();
        }
      }
    }
    async function throwAtTargets(reason: unknown) {
      if (done) return;
      done = true;
      const promises = [...inner()].filter(Boolean);
      if (promises.length) {
        await Promise.any(promises);
      }

      function* inner() {
        yield mainTarget?.throw(reason);
        for (const target of targets.values()) {
          yield target?.throw(reason);
        }
      }
    }

    async function pushToTarget(snapshot: T[]) {
      const promises = [...inner()].filter(Boolean);
      if (promises.length) {
        await Promise.any(promises);
      }
      function* inner() {
        yield mainTarget?.push(snapshot);
        for (const [index, value] of Object.entries(snapshot)) {
          const target = targets.get(+index);
          if (!target) continue;
          assert(value);
          yield target.push(value);
        }
      }
    }

    async function read() {
      try {
        ok(!started);
        started = true;
        for await (const snapshot of source) {
          if (done) break;
          if (empty === false && snapshot.length === 0) {
            continue;
          }
          await pushToTarget(snapshot);
        }
        await close();
      } catch (error) {
        await throwAtTargets(error);
      }
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
      const async = getAsyncIterableOutput(target);
      return anAsyncThing(async);
    }

    function atTarget(index: number) {
      const existing = targets.get(index);
      if (existing) return existing;
      const target = new Push<T>(options);
      targets.set(index, target);
      return target;
    }

    function at(index: number) {
      // if (isSplitAt(input)) {
      //   const result = input.at(index);
      //   if (isAsyncIterable<T[]>(result)) {
      //     return createSplitContext(result).at(0);
      //   }
      // }
      return getOutput(atTarget(index));
    }

    function filter(fn: FilterFn<T>): AsyncIterable<T[]> {
      return {
        async *[Symbol.asyncIterator]() {
          for await (const snapshot of source) {
            yield* check(snapshot.filter(fn));
          }
        },
      };
    }

    function flatMap<M>(fn: MapFn<T, M[] | M>): AsyncIterable<M[]> {
      return {
        async *[Symbol.asyncIterator]() {
          for await (const snapshot of map(fn)) {
            yield* check(snapshot.flatMap((value) => value));
          }
        },
      };
    }

    function map<M>(fn: MapFn<T, M>): AsyncIterable<M[]> {
      return {
        async *[Symbol.asyncIterator]() {
          for await (const snapshot of source) {
            const result = snapshot.map(fn);
            const promises = result.filter<Promise<M>>(isPromise);
            if (isSyncArray(result, promises)) {
              yield* check(result);
            } else {
              const promiseResults = await Promise.all(promises);
              const completeResults = result.map((value) => {
                if (isPromise(value)) {
                  const index = promises.indexOf(value);
                  return promiseResults[index];
                } else {
                  return value;
                }
              });
              yield* check(completeResults);
            }
          }
        },
      };

      function isSyncArray(
        value: unknown[],
        promises: Promise<M>[]
      ): value is M[] {
        return !promises.length;
      }
    }

    function take(count: number) {
      return {
        async *[Symbol.asyncIterator]() {
          let current = 0;
          for await (const snapshot of source) {
            for (const output of check(snapshot)) {
              yield output;
              current += 1;
              if (current >= count) {
                return;
              }
            }
          }
        },
      };
    }

    function find(fn: FilterFn<T>): TheAsyncThing<T> {
      return anAsyncThing({
        async *[Symbol.asyncIterator]() {
          for await (const [first] of filter(fn)) {
            yield first;
          }
        },
      });
    }

    function findIndex(fn: FilterFn<T>): TheAsyncThing<number> {
      return anAsyncThing({
        async *[Symbol.asyncIterator]() {
          for await (const snapshot of source) {
            yield snapshot.findIndex(fn);
          }
        },
      });
    }

    function every(fn: FilterFn<T>): TheAsyncThing<boolean> {
      return anAsyncThing({
        async *[Symbol.asyncIterator]() {
          let yielded = false;
          for await (const snapshot of source) {
            const every = snapshot.every(fn);
            yield every;
            yielded = true;
          }
          if (!yielded) {
            yield true;
          }
        },
      });
    }

    function concat(
      other: SplitConcatInput<T>,
      ...rest: SplitConcatSyncInput<T>[]
    ): AsyncIterable<T[]> {
      return {
        async *[Symbol.asyncIterator]() {
          if (!isAsyncIterable(other)) {
            for await (const snapshot of source) {
              yield [...snapshot, ...asIterable(other), ...rest].flatMap(
                asArray
              );
            }
            return;
          }

          for await (const [left, right] of union([source, other])) {
            yield [...asArray(left), ...asArray(right)].flatMap(asArray);
          }

          function asIterable(other: SplitConcatSyncInput<T>): Iterable<T> {
            return isIterable(other) ? other : [other];
          }

          function asArray(other: SplitConcatSyncInput<T>): T[] {
            return [...asIterable(other)];
          }
        },
      };
    }

    function copyWithin(
      target: number,
      start?: number,
      end?: number
    ): AsyncIterable<T[]> {
      return {
        async *[Symbol.asyncIterator]() {
          for await (const snapshot of source) {
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/copyWithin
            //
            // If target is at or greater than arr.length, nothing will be copied.
            // If target is positioned after start, the copied sequence will be trimmed to fit arr.length.
            //
            // Use concat beforehand and create a bigger array, then copy to the newly available space
            yield [...snapshot].copyWithin(target, start, end);
          }
        },
      };
    }

    function entries(): AsyncIterable<[number, T][]> {
      return {
        async *[Symbol.asyncIterator]() {
          for await (const snapshot of source) {
            yield [...snapshot.entries()];
          }
        },
      };
    }

    function includes(search: T, fromIndex?: number): TheAsyncThing<boolean> {
      return anAsyncThing({
        async *[Symbol.asyncIterator]() {
          let yielded = false;
          for await (const snapshot of source) {
            yield snapshot.includes(search, fromIndex);
            yielded = true;
          }
          if (!yielded) {
            yield false;
          }
        },
      });
    }

    function reverse(): AsyncIterable<T[]> {
      return {
        async *[Symbol.asyncIterator]() {
          for await (const snapshot of source) {
            yield [...snapshot].reverse();
          }
        },
      };
    }

    function push(other: SplitInput<T>): AsyncIterable<T[]>;
    function push<M>(other: SplitInput<M>): AsyncIterable<(M | T)[]>;
    function push(other: SplitInput<T>): AsyncIterable<T[]> {
      return {
        async *[Symbol.asyncIterator]() {
          yield* source;
          yield* createSplitContext(other);
        },
      };
    }

    function group<K extends string | number | symbol>(
      fn: MapFn<T, K>
    ): Record<K, AsyncIterable<T[]>> {
      const known: AsyncIterable<T[]>[] = [];
      const indexes: Partial<Record<K, number>> = {};
      let index = -1;

      function getIndex(key: K): number {
        const existing = indexes[key];
        if (typeof existing === "number") {
          return existing;
        }
        const next = (index += 1);
        indexes[key] = next;
        return next;
      }

      const result = createSplitContext({
        async *[Symbol.asyncIterator]() {
          for await (const snapshot of map((input, ...args) => {
            const maybeGroup = fn(input, ...args);
            if (isPromise(maybeGroup)) {
              return maybeGroup.then((group) => [group, input] as const);
            } else {
              return [maybeGroup, input] as const;
            }
          })) {
            const grouped = snapshot.reduce(
              (grouped: Partial<Record<K, T[]>>, [group, input]: [K, T]) => {
                grouped[group] = grouped[group] ?? [];
                grouped[group].push(input);
                return grouped;
              },
              {}
            );

            const aligned: T[][] = [];

            for (const [group, values] of Object.entries(grouped)) {
              ok<K>(group);
              ok<T[]>(values);
              aligned[getIndex(group)] = values;
            }

            for (const index of known.keys()) {
              aligned[index] = aligned[index] ?? [];
            }

            yield aligned;
          }
        },
      });
      const iterator = result[Symbol.iterator]();

      function getIndexedFromKnown(index: number) {
        while (!known[index]) {
          const result = iterator.next();
          ok(isIteratorYieldResult(result));
          known.push(result.value);
        }
        return known[index];
      }

      const output = new Proxy(known, {
        get(_, name) {
          ok<K>(name);
          const index = getIndex(name);
          return getIndexedFromKnown(index);
        },
      });
      ok<Record<K, AsyncIterable<T[]>>>(output);
      return output;
    }

    function groupToMap<K extends string | number | symbol>(
      fn: MapFn<T, K>
    ): AsyncMap<K, AsyncIterable<T[]>> {
      const grouped = group(fn);
      return {
        get(key: K): AsyncIterable<T[]> {
          return grouped[key];
        },
        set(): never {
          return no();
        },
        has(key: K): TheAsyncThing<boolean> {
          return anAsyncThing({
            async *[Symbol.asyncIterator](): AsyncIterator<boolean> {
              let yielded = false;
              for await (const snapshot of grouped[key]) {
                yield snapshot.length > 0;
                yielded = true;
              }
              if (!yielded) {
                yield false;
              }
            },
          });
        },
        delete(): never {
          return no();
        },
        get size() {
          return no();
        },
      };
    }

    return {
      async *[Symbol.asyncIterator](): AsyncIterableIterator<T[]> {
        yield* getAsyncIterableOutput(getMainTarget());
      },
      [Symbol.iterator]() {
        let index = -1;
        return {
          next() {
            const currentIndex = (index += 1);
            return { done: false, value: at(currentIndex) };
          },
        };
      },
      filter,
      find,
      findIndex,
      map,
      at,
      call,
      bind,
      take,
      every,
      concat,
      copyWithin,
      entries,
      flatMap,
      includes,
      reverse,
      group,
      groupToMap,
      push,
    };
  }

  function defineProperties(fn: unknown): asserts fn is SplitCore<T> {
    // const source = fn;
    const symbols = options ? Object.getOwnPropertySymbols(options) : [];

    for (const symbol of symbols) {
      const descriptor = Object.getOwnPropertyDescriptor(options, symbol);
      if (!descriptor) continue;
      Object.defineProperty(fn, symbol, descriptor);
    }

    Object.defineProperties(fn, {
      [Symbol.asyncIterator]: {
        value: context[Symbol.asyncIterator],
      },
      [Symbol.iterator]: {
        value: context[Symbol.iterator],
      },
      find: {
        value: context.find,
      },
      findIndex: {
        value: context.findIndex,
      },
      filter: {
        value(fn: FilterFn<T>) {
          return split(context.filter(fn), options);
        },
      },
      take: {
        value(count: number) {
          return split(context.take(count), options);
        },
      },
      map: {
        value<M>(fn: MapFn<T, M>, otherOptions?: SplitOptions) {
          return split(context.map(fn), otherOptions ?? options);
        },
      },
      flatMap: {
        value<M>(fn: MapFn<T, M[] | M>, otherOptions?: SplitOptions) {
          return split(context.flatMap(fn), otherOptions ?? options);
        },
      },
      concat: {
        value(other: SplitConcatInput<T>) {
          return split(context.concat(other), options);
        },
      },
      reverse: {
        value() {
          return split(context.reverse(), options);
        },
      },
      copyWithin: {
        value(target: number, start?: number, end?: number) {
          return split(context.copyWithin(target, start, end), options);
        },
      },
      entries: {
        value() {
          return split(context.entries(), {
            keep: options?.keep,
          });
        },
      },
      group: {
        value<K extends string | number | symbol>(fn: MapFn<T, K>) {
          const proxied = new Proxy(context.group(fn), {
            get(target, name) {
              ok<K>(name);
              const result = target[name];
              return split(result, options);
            },
          });
          ok<Record<K, SplitCore<T>>>(proxied);
          return proxied;
        },
      },
      groupToMap: {
        value<K extends string | number | symbol>(fn: MapFn<T, K>) {
          const map = context.groupToMap(fn);
          const get = map.get.bind(map);
          map.get = (key) => {
            return split(get(key), options);
          };
          return map;
        },
      },
      push: {
        value<M>(
            other: SplitInput<M>,
            otherOptions?: TypedSplitOptions<M> | SplitOptions
        ) {
          return split(context.push(other), otherOptions ?? options);
        },
      },
      at: {
        value: context.at,
      },
      every: {
        value: context.every,
      },
      includes: {
        value: context.includes,
      },
      then: {
        value: async.then,
      },
      catch: {
        value: async.catch,
      },
      finally: {
        value: async.finally,
      },
    });
  }

  function isSplit(object: unknown): object is SplitCore<T> {
    if (!isLike<Partial<Record<keyof SplitCore<unknown>, undefined>>>(object)) return false;
    return (
        typeof object.then === "function" &&
        typeof object[Symbol.asyncIterator] === "function" &&
        typeof object[Symbol.iterator] === "function"
    );
  }

  function assertSplit(object: unknown): asserts object is SplitCore<T> {
    ok(isSplit(object));
  }

  function createFn() {
    const fn: unknown = function SplitFn(this: unknown, ...args: unknown[]) {
      return split(context.bind(this, ...args), options);
    };
    defineProperties(fn);
    return fn;
  }

  function createInstance() {
    class Split { }
    defineProperties(Split.prototype);
    const instance = new Split();
    assertSplit(instance);
    return instance;

    // class Split implements SplitCore<T>, Promise<T[]> {
    //
    //   then: Promise<T[]>["then"] = async.then.bind(async);
    //   catch: Promise<T[]>["catch"] = async.catch.bind(async);
    //   finally: Promise<T[]>["finally"] = async.finally.bind(async);
    //
    //   get [Symbol.toStringTag]() {
    //     return "[object Split]";
    //   }
    //
    //   get [Symbol.asyncIterator]() {
    //     return context[Symbol.asyncIterator];
    //   }
    //
    //   get [Symbol.iterator]() {
    //     return context[Symbol.iterator];
    //   }
    //
    //   get at() {
    //     return context.at;
    //   }
    //
    //   get find() {
    //     return context.find;
    //   }
    //
    //   get findIndex() {
    //     return context.findIndex;
    //   }
    //
    //   get every() {
    //     return context.every;
    //   }
    //
    //   get includes() {
    //     return context.includes;
    //   }
    //
    //   filter(fn: FilterFn<T>) {
    //     return split(context.filter(fn), options);
    //   }
    //
    //   take(count: number) {
    //     return split(context.take(count), options);
    //   }
    //
    //   map<M>(
    //     fn: MapFn<T, M>,
    //     otherOptions?: TypedSplitOptions<M> | SplitOptions
    //   ) {
    //     return split(context.map(fn), otherOptions ?? options);
    //   }
    //
    //   flatMap<M>(
    //     fn: MapFn<T, M[] | M>,
    //     otherOptions?: TypedSplitOptions<M> | SplitOptions
    //   ) {
    //     return split(context.flatMap(fn), otherOptions ?? options);
    //   }
    //
    //   concat(other: SplitConcatInput<T>, ...rest: T[]) {
    //     if (rest.length) {
    //       ok<T>(other);
    //       return split(context.concat(other, ...rest));
    //     } else {
    //       return split(context.concat(other), options);
    //     }
    //   }
    //
    //   copyWithin(target: number, start?: number, end?: number) {
    //     return split(context.copyWithin(target, start, end), options);
    //   }
    //
    //   reverse() {
    //     return split(context.reverse(), options);
    //   }
    //
    //   entries() {
    //     return split(context.entries(), {
    //       keep: options?.keep,
    //     });
    //   }
    //
    //   push<M>(
    //     other: SplitInput<M>,
    //     otherOptions?: TypedSplitOptions<M> | SplitOptions
    //   ) {
    //     return split(context.push(other), otherOptions ?? options);
    //   }
    //
    //   group<K extends string | number | symbol>(fn: MapFn<T, K>) {
    //     const proxied = new Proxy(context.group(fn), {
    //       get(target, name) {
    //         ok<K>(name);
    //         const result = target[name];
    //         return split(result, options);
    //       },
    //     });
    //     ok<Record<K, SplitCore<T>>>(proxied);
    //     return proxied;
    //   }
    //
    //   groupToMap<K extends string | number | symbol>(fn: MapFn<T, K>) {
    //     const map = context.groupToMap(fn);
    //     const get = map.get.bind(map);
    //     map.get = (key) => {
    //       return split(get(key), options);
    //     };
    //     ok<AsyncMap<K, SplitCore<T>>>(map);
    //     return map;
    //   }
    //
    //   call(that: unknown, ...args: unknown[]) {
    //     return split<T>(context.call.bind(undefined, that, ...args), options);
    //   }
    //
    //   bind(that: unknown, ...args: unknown[]) {
    //     return split(context.bind(that, ...args), options);
    //   }
    // }
    // return new Split();
  }
}
