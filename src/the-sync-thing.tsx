import {
  isIterable,
  isIteratorNext,
  isIteratorReturn,
  isIteratorThrow,
  isIteratorYieldResult
} from "./is";
import {TheAsyncThing} from "./the-thing";

export type TheSyncThing<T = unknown, PT = T> =
  & Omit<TheAsyncThing<T, PT>, "next" | "return" | "throw">
  & Iterable<T>
  & {
    next(...args: unknown[]): ReturnType<Iterator<T, unknown, unknown>["next"]> & ReturnType<AsyncIterator<T, unknown, unknown>["next"]>
    return(...args: unknown[]): ReturnType<Iterator<T, unknown, unknown>["return"]> & ReturnType<AsyncIterator<T, unknown, unknown>["return"]>
    throw(...args: unknown[]): ReturnType<Iterator<T, unknown, unknown>["throw"]> & ReturnType<AsyncIterator<T, unknown, unknown>["throw"]>
  };

export type TheSyncThingInput<T> = Partial<Iterable<T> & Iterator<T, unknown>>

export function aSyncThing<T>(sync: TheSyncThingInput<T>): TheSyncThing<T, T> {
  let iterator: Iterator<T, unknown, unknown>,
      lastIterator: Iterator<T, unknown, unknown>,
      promise: Promise<T>;

  function resolvedPromise<V>(value?: V, error?: unknown): Promise<V> {
    return {
      async then(resolve, reject) {
        if (error) {
          return reject(error);
        } else {
          return resolve(value);
        }
      },
      async catch(reject) {
        if (error) {
          return reject(error);
        }
      },
      async finally() {
        throw new Error("promise.finally not supported with sync promise");
      },
      get [Symbol.toStringTag]() {
        return "SyncPromise"
      }
    };
  }

  const doneResult: IteratorResult<T> = { done: true, value: undefined };

  const thing: TheSyncThing<T, T> = {
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
      for (const next of thing) {
        yield next;
      }
    },
    *[Symbol.iterator]() {
      const value = sync;
      if (isIterable(value)) {
        yield * value;
      } else if (isIteratorNext<T>(value)) {
        let result: IteratorResult<T, unknown>,
            returnYield: unknown;
        try {
          do {
            result = value.next();
            if  (isIteratorYieldResult(result)) {
              returnYield = yield result.value;
            }
          } while (isIteratorYieldResult(result));
        } catch (error) {
          if (isIteratorThrow(value)) {
            value.throw(error);
          } else {
            throw error;
          }
        } finally {
          if (isIteratorReturn(value)) {
            value.return(returnYield);
          }
        }
      }
    },
    next(...args: [] | [unknown]) {
      if (!iterator) {
        if (lastIterator) {
          lastIterator?.return?.(...args);
          lastIterator = undefined;
        }
        iterator = thing[Symbol.iterator]();
      }
      const result: IteratorResult<T> = iterator.next(...args);
      if (result.done) {
        lastIterator = iterator;
        iterator = undefined;
      }
      const promise = resolvedPromise(result.value);
      return { ...promise, ...result };
    },
    return(...args: [] | [unknown]) {
      const currentIterator = iterator ?? lastIterator;
      const result: IteratorResult<T> = currentIterator?.return?.(...args) ?? doneResult;
      const promise = resolvedPromise(result.value);
      return { ...promise, ...result };
    },
    throw(...args: [] | [unknown]) {
      const currentIterator = iterator ?? lastIterator;
      const result: IteratorResult<T> = currentIterator?.throw?.(...args) ?? doneResult;
      const promise = resolvedPromise(result.value);
      return { ...promise, ...result };
    },
    get [Symbol.toStringTag]() {
      return "TheSyncThing"
    }
  }
  return thing;

  function getPromise(): Promise<T> {
    const next = thing.next();
    return resolvedPromise(isIteratorYieldResult(next) ? next.value : undefined);
  }

}