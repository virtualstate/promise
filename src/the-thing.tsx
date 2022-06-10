import {isAsyncIterable, isIterable} from "./is";

export type TheAsyncThing<T = unknown, PT = T> =
  & Promise<PT>
  & AsyncIterable<T>
  & AsyncIterator<T, unknown, unknown>;

export type TheAsyncThingInput<T> = Partial<AsyncIterable<T> | AsyncIterator<T,  unknown> | Promise<T>>;

export function anAsyncThing<T>(async: TheAsyncThingInput<T>): TheAsyncThing<T, T>
export function anAsyncThing<T, I extends Iterable<T>>(sync: I): TheAsyncThing<I, I>
export function anAsyncThing<T>(async: TheAsyncThingInput<T>): TheAsyncThing<T, T>  {
  let iterator: AsyncIterator<T, unknown, unknown>,
      promise: Promise<T>;

  const thing: TheAsyncThing<T, T> = {
    async then(resolve, reject) {
      return getPromise().then(resolve, reject);
    },
    async catch(reject) {
      return getPromise().catch(reject);
    },
    async finally(fn) {
      return getPromise().finally(fn);
    },
    async *[Symbol.asyncIterator]() {
      if (isAsyncIterable<T>(async)) {
        return yield * async;
      } else if ("then" in async && async.then) {
        yield await new Promise((resolve, reject) => async.then(resolve, reject));
      } else if (isSyncIterableValue(async)) {
        yield async;
      } else if ("next" in async && async.next) {
        let result;
        let nextValue;
        do {
          result = await async.next();
          if (isYieldedResult(result)) {
            nextValue = yield result.value;
          }
        } while (!result.done);
      }

      function isSyncIterableValue(value: unknown): value is T {
        return isIterable(value);
      }
    },
    async next(...args: [] | [unknown]) {
      iterator = iterator ?? thing[Symbol.asyncIterator]();
      return iterator.next(...args);
    },
    async return(...args: [] | [unknown]) {
      if (!iterator) return;
      return iterator.return(...args);
    },
    async throw(...args: [] | [unknown]) {
      if (!iterator) return;
      return iterator.throw(...args);
    },
    get [Symbol.toStringTag]() {
      return "TheAsyncThing"
    }
  }
  return thing;

  function getPromise(): Promise<T> {
    promise = promise || asPromise();
    return promise;
    async function asPromise(): Promise<T> {
      if ("then" in async && async.then) {
        return new Promise((resolve, reject) => async.then(resolve, reject));
      }
      let value: T;
      for await (value of thing) {}
      return value;
    }
  }

  function isYieldedResult(value: IteratorResult<T>): value is IteratorYieldResult<T> {
    return !value.done;
  }
}