/* c8 ignore start */
import { ok } from "./like";

export type DeferredStatus = "pending" | "fulfilled" | "rejected";

export interface Deferred<T = void> {
  resolve(value: T): void;
  reject(reason: unknown): void;
  promise: Promise<T>;
  readonly waiting: Promise<void>;
  readonly settled: boolean;
  readonly status: DeferredStatus;
}

type InternalDeferred<T> = Omit<Deferred<T>, "waiting">

function internal<T = void>(): InternalDeferred<T> {
  let resolve: Deferred<T>["resolve"] | undefined = undefined,
      reject: Deferred<T>["reject"] | undefined = undefined,
      settled = false,
      status: DeferredStatus = "pending";
  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolve = (value) => {
      status = "fulfilled";
      settled = true;
      resolveFn(value);
    };
    reject = (reason) => {
      status = "rejected";
      settled = true;
      rejectFn(reason);
    };
  });
  ok(resolve);
  ok(reject);
  return {
    get settled() {
      return settled;
    },
    get status() {
      return status;
    },
    resolve,
    reject,
    promise,
  };
}

export interface DeferOptions {
  waiting?: boolean | "then"
}

const resolved = Promise.resolve();

export function defer<T = void>(options: DeferOptions = {}): Deferred<T> {
  const deferred = internal<T>();
  const { resolve, reject, promise } = deferred;
  const waiting = internal();

  if (options.waiting || true) {

    const thenFn = promise.then.bind(promise);
    const otherFns = options.waiting === true;

    promise.then = (...args) => {
      if (args[0] || otherFns) {
        waiting.resolve();
      }
      return thenFn(...args);
    }

    if (otherFns) {
      const catchFn = promise.catch.bind(promise);
      const finallyFn = promise.finally.bind(promise);
      promise.catch = (...args) => {
        waiting.resolve();
        return catchFn(...args);
      }
      promise.finally = (...args) => {
        waiting.resolve();
        return finallyFn(...args);
      }
    }
  }

  return {
    get settled() {
      return deferred.settled;
    },
    get status() {
      return deferred.status;
    },
    get waiting() {
      return options.waiting ? waiting.promise : resolved;
    },
    resolve,
    reject,
    promise
  };
}
