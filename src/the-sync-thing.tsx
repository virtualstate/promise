import { isIterable } from "./is";

type TheAsyncSyncThing<T = unknown> = AsyncIterable<Iterable<T>> &
  Promise<Iterable<T>>;

export type TheSyncThing<T = unknown> = TheAsyncSyncThing<T> &
  Iterator<T, unknown, unknown> &
  Partial<Iterable<T>>;

export function aSyncThing<T, I extends Iterable<T>>(sync: I): TheSyncThing<T>;
export function aSyncThing<T>(sync: T): TheSyncThing<T>;
export function aSyncThing<T>(sync: T): TheSyncThing {
  let iterator: Iterator<unknown, unknown, unknown>;
  const thing: TheSyncThing & Iterable<unknown> = {
    async then(resolve, reject) {
      void reject;
      return resolve(isIterable(sync) ? sync : makeIterableFromThing());
    },
    /* c8 ignore start */
    async catch() {
      throw new Error("promise.catch not supported with sync promise");
    },
    async finally() {
      throw new Error("promise.finally not supported with sync promise");
    },
    /* c8 ignore end */
    async *[Symbol.asyncIterator]() {
      if (isIterable(sync)) {
        yield sync;
      } else {
        yield makeIterableFromSync();
      }
    },
    *[Symbol.iterator]() {
      if (isIterable(sync)) {
        yield* sync;
      } else {
        yield sync;
      }
    },
    next(...args: [] | [unknown]) {
      iterator =
        iterator ??
        (isIterable(sync) ? sync[Symbol.iterator]() : thing[Symbol.iterator]());
      return iterator.next(...args);
    },
    return(...args: [] | [unknown]) {
      const result: IteratorResult<unknown> = iterator?.return?.(...args);
      iterator = undefined;
      return result ?? { done: true, value: undefined };
    },
    throw(...args: [] | [unknown]) {
      const result: IteratorResult<unknown> = iterator?.throw?.(...args);
      iterator = undefined;
      return result ?? { done: true, value: undefined };
    },
    get [Symbol.toStringTag]() {
      return "TheSyncThing";
    },
  };
  return thing;

  function makeIterableFromSync() {
    return {
      *[Symbol.iterator]() {
        yield sync;
      },
    };
  }

  function makeIterableFromThing() {
    return {
      *[Symbol.iterator]() {
        yield* thing;
      },
    };
  }
}
