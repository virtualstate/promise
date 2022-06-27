import { anAsyncThing, TheAsyncThing } from "../the-thing";
import { Push, PushOptions } from "../push";
import { isLike, ok } from "../like";
import {isAsyncIterable, isIterable, isPromise} from "../is";
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
} from "./type";

function identity(value: unknown) {
  return value;
}

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
  options?: SplitOptions<T>
): SplitFn<T>;
export function split<T>(
  input: SplitInput<T>,
  options?: SplitOptions<T>
): SplitCore<T>;
export function split<T>(
  input: SplitInput<T>,
  options?: SplitOptions<T>
): SplitCore<T> {
  function assert(value: unknown): asserts value is T {
    const { assert: fn, is } = options ?? {};
    const fnAssert: SplitAssertFn<T> = isLike<SplitAssertFn<T>>(fn)
      ? fn
      : undefined;
    if (fnAssert) {
      fnAssert(value);
    } else if (is) {
      ok(is(value));
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
    options?: SplitOptions<T>
  ): SplitAsyncIterable<T> {
    const targets = new Map<number, Push<T>>(),
      filters = new Map<FilterFn<T>, Push<T[]>>(),
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

    async function* call(
      that?: unknown,
      ...args: unknown[]
    ): AsyncIterable<T[]> {
      for await (const snapshot of innerCall()) {
        yield Array.isArray(snapshot) ? snapshot : (
            isIterable(snapshot) ? Array.from(snapshot) : [snapshot]
        );
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

    function close() {
      if (done) return;
      done = true;
      mainTarget?.close();
      for (const target of targets.values()) {
        target?.close();
      }
      for (const target of filters.values()) {
        target?.close();
      }
    }

    async function read() {
      try {
        ok(!started);
        started = true;
        for await (const snapshot of source) {
          if (done) break;
          // If there is no length then the targets will not be invoked
          // It would be two different representations if we did anything different
          // for our main target too, so we will skip the entire update
          //
          // no filter.length will also skip a filter from being updated too
          if (!snapshot.length) continue;
          mainTarget?.push(snapshot);
          for (const [index, value] of Object.entries(snapshot)) {
            assert(value);
            targets.get(+index)?.push(value);
          }
          for (const [fn, target] of filters.entries()) {
            const filtered = snapshot.filter(fn);
            if (!filtered.length) continue;
            target.push(filtered);
          }
        }
        close();
      } catch (error) {
        mainTarget?.throw(error);
        for (const target of targets.values()) {
          target?.throw(error);
        }
        for (const target of filters.values()) {
          target?.throw(error);
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
      const async = getAsyncIterableOutput(target);
      return anAsyncThing(async);
    }

    function at(index: number) {
      if (isSplitAt(input)) {
        const result = input.at(index);
        if (isAsyncIterable<T[]>(result)) {
          return createSplitContext(result).at(0);
        }
      }
      const existing = targets.get(index);
      if (existing) {
        return getOutput(existing);
      }
      const target = new Push<T>(options);
      targets.set(index, target);
      return getOutput(target);
    }

    function getFilterTarget(fn: FilterFn<T>) {
      const existing = filters.get(fn);
      if (existing) {
        return existing;
      }
      const target = new Push<T[]>();
      filters.set(fn, target);
      return target;
    }

    function filter(fn: FilterFn<T>) {
      return getOutput(getFilterTarget(fn));
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

    function named(name: Name) {
      const nameFn = getNamedFilter(name);
      return filter(nameFn);
    }

    async function* map<M>(fn: MapFn<T, M>): AsyncIterable<M[]> {
      for await (const snapshot of source) {
        const result = snapshot.map(fn);
        const promises = result.filter<Promise<M>>(isPromise);
        if (isSyncArray(result, promises)) {
          yield result;
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
          yield completeResults;
        }
      }

      function isSyncArray(
        value: unknown[],
        promises: Promise<M>[]
      ): value is M[] {
        return !promises.length;
      }
    }

    async function * take(count: number) {
      let current = 0;
      for await (const snapshot of source) {
        yield snapshot;
        current += 1;
        if (current === count) {
          break;
        }
      }
      close();
    }

    function find(fn: FilterFn<T>): TheAsyncThing<T> {
      const filtered = filter(fn);
      return anAsyncThing({
        async *[Symbol.asyncIterator]() {
          for await (const [first] of filtered) {
            yield first;
          }
        }
      })
    }

    return {
      async *[Symbol.asyncIterator](): AsyncIterableIterator<T[]> {
        mainTarget = mainTarget ?? new Push(options);
        yield* getAsyncIterableOutput(mainTarget);
      },
      [Symbol.iterator]() {
        function* withIndex(index: number): Iterable<TheAsyncThing<T>> {
          yield at(index);
          yield* withIndex(index + 1);
        }
        return withIndex(0)[Symbol.iterator]();
      },
      filter,
      find,
      named,
      map,
      at,
      call,
      bind,
      take
    };
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
        },
        [Symbol.iterator]: {
          value: context[Symbol.iterator],
        },
        find: {
          value: context.find,
        },
        filter: {
          value(fn: FilterFn<T>) {
            return split(context.filter(fn), options);
          },
        },
        named: {
          value(name: Name) {
            return split(context.named(name), options);
          },
        },
        take: {
          value(count: number) {
            return split(context.take(count), options);
          },
        },
        map: {
          value<M>(fn: MapFn<T, M>, otherOptions?: SplitOptions<M>) {
            let name: SplitOptions<M>["name"] = options?.name
              ? (value) => {
                  assert(value);
                  return options?.name(value);
                }
              : undefined;
            return split(context.map(fn), {
              keep: options?.keep,
              name,
              ...otherOptions
            });
          },
        },
        at: {
          value: context.at,
        },
        toArray: {
          value: async.then,
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
  }

  function createInstance() {
    class Split implements SplitCore<T>, Promise<T[]> {
      then: Promise<T[]>["then"] = async.then.bind(async);
      catch: Promise<T[]>["catch"] = async.catch.bind(async);
      finally: Promise<T[]>["finally"] = async.finally.bind(async);

      get [Symbol.toStringTag]() {
        return "[object Split]";
      }

      get [Symbol.asyncIterator]() {
        return context[Symbol.asyncIterator];
      }

      get [Symbol.iterator]() {
        return context[Symbol.iterator];
      }

      get at() {
        return context.at;
      }

      get find() {
        return context.find;
      }

      filter(fn: FilterFn<T>) {
        return split(context.filter(fn), options);
      }

      named(name: Name) {
        return split(context.named(name), options);
      }

      take(count: number) {
        return split(context.take(count), options);
      }

      map<M>(fn: MapFn<T, M>, otherOptions?: SplitOptions<M>) {
        let name: SplitOptions<M>["name"] = options?.name
            ? (value) => {
              assert(value);
              return options?.name(value);
            }
            : undefined;
        return split(context.map(fn), {
          keep: options?.keep,
          name,
          ...otherOptions
        });
      }

      toArray() {
        return async;
      }

      call(that: unknown, ...args: unknown[]) {
        return split(context.call.bind(undefined, that, ...args), options);
      }

      bind(that: unknown, ...args: unknown[]) {
        return split(context.bind(that, ...args), options);
      }
    }
    return new Split();
  }
}
