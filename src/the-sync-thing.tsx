
import {isIterable} from "./is";

export type TheSyncThing<T = unknown> =
  & AsyncIterable<Iterable<T>>
  & Promise<Iterable<T>>
  & Iterable<T>
  & Iterator<T, unknown, unknown>;

export function aSyncThing<T, I extends Iterable<T>>(sync: I): TheSyncThing<T>
export function aSyncThing<T>(sync: T): TheSyncThing<T>
export function aSyncThing<T>(sync: T): TheSyncThing {
  let iterator: Iterator<unknown, unknown, unknown>;

  function resolvedPromise<V>(value: V): Promise<V> {
    return {
      async then(resolve, reject) {
        void reject;
        return resolve(value);
      },
      /* c8 ignore start */
      async catch() {
        throw new Error("promise.catch not supported with sync promise");
      },
      async finally() {
        throw new Error("promise.finally not supported with sync promise");
      },
      get [Symbol.toStringTag]() {
        return "SyncPromise"
      }
      /* c8 ignore end */
    };
  }

  const doneResult: IteratorResult<T> = { done: true, value: undefined };

  const thing: TheSyncThing = {
    then(resolve, reject) {
      return getPromise().then(resolve, reject);
    },
    catch(reject) {
      return getPromise().catch(reject);
    },
    finally(fn) {
      return getPromise().finally(fn);
    },
    async *[Symbol.asyncIterator]() {
      if (isIterable(sync)) {
        return yield sync;
      }
      yield {
        *[Symbol.iterator]() {
          yield * thing;
        }
      }
    },
    *[Symbol.iterator]() {
      if (isIterable(sync)) {
        yield * sync;
      } else {
        yield sync;
      }
    },
    next(...args: [] | [unknown]) {
      iterator = iterator ?? thing[Symbol.iterator]();
      return iterator.next(...args);
    },
    return(...args: [] | [unknown]) {
      const result: IteratorResult<unknown> = iterator?.return?.(...args) ?? doneResult;
      iterator = undefined;
      return result;
    },
    throw(...args: [] | [unknown]) {
      const result: IteratorResult<unknown> = iterator?.throw?.(...args) ?? doneResult;
      iterator = undefined;
      return result;
    },
    get [Symbol.toStringTag]() {
      return "TheSyncThing"
    }
  }
  return thing;

  function getPromise() {
    return resolvedPromise(isIterable(sync) ? sync : thing);
  }

}