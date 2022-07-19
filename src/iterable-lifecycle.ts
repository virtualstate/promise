import {isIteratorResult, isIteratorYieldResult, isPromise} from "./is";

/**
 * @experimental
 * @internal
 */
export interface IterableLifecycleIterator<
  T,
  Result = IteratorResult<T> | undefined
> {
  next(arg?: unknown, arg2?: unknown): Result;
  return?(arg?: unknown, arg2?: unknown): Result;
  throw?(reason?: unknown, arg2?: unknown): Result;
}

/**
 * @experimental
 * @internal
 */
export interface IterableLifecycle<
  T,
  I extends IterableLifecycleIterator<T> = IterableLifecycleIterator<T>
> {
  next: Omit<I, "throw"> | I["next"];
  return?: Omit<I, "throw"> | I["return"];
  throw?: I["throw"];
}

interface IteratorLifecycleContext<T, I extends IterableLifecycleIterator<T, unknown> = IterableLifecycleIterator<T, unknown>> {
  iterator: I,
  lifecycle: IterableLifecycle<T>,
  result?: IteratorResult<T>;
  returned?: unknown;
  done: boolean;
}

interface AsyncIteratorLifecycleContext<T> extends IteratorLifecycleContext<T, AsyncIterator<T>> {

}

interface SyncIteratorLifecycleContext<T> extends IteratorLifecycleContext<T, Iterator<T>> {

}

function *iterateLifecycle<T, C extends IteratorLifecycleContext<T>>(context: C): Iterable<unknown> {
  try {
    do {
      yield * lifecycleNext();
      yield * lifecycleIteratorNext();
      yield * lifecycleNextReturn();
    } while (!context.done);
  } catch (reason) {
    yield * lifecycleThrow(reason);
    yield * lifecycleIteratorThrow(reason);
  } finally {
    yield * lifecycleReturn();
    yield * lifecycleIteratorReturn();
    yield * lifecycleReturnReturn();
  }

  function *lifecycleNext() {
    if (typeof context.lifecycle.next === "function") {
      yield context.lifecycle.next(context.returned);
    } else if (context.lifecycle.next?.next) {
      yield context.lifecycle.next.next(context.returned);
    }
  }

  function *lifecycleIteratorNext() {
    yield context.iterator.next(context.returned);
  }

  function *lifecycleIteratorThrow(reason: unknown) {
    yield context.iterator.throw?.(reason, context.result);
  }

  function *lifecycleIteratorReturn() {
    yield context.iterator.return?.(context.returned, context.result);
  }

  function *lifecycleNextReturn() {
    if (typeof context.lifecycle.next !== "function" && context.lifecycle.next.return) {
      yield context.lifecycle.next.return(context.returned, context.result);
    }
  }

  function *lifecycleReturn() {
    if (typeof context.lifecycle.return === "function") {
      yield context.lifecycle.return(context.returned);
    } else if (context.lifecycle.return?.next) {
      yield context.lifecycle.return.next(context.returned);
    }
  }

  function *lifecycleReturnReturn() {
    if (typeof context.lifecycle.return !== "function" && context.lifecycle.return?.return) {
      yield context.lifecycle.return.return(context.returned);
    }
  }

  function *lifecycleThrow(reason: unknown) {
    if (typeof context.lifecycle.throw === "function") {
      yield context.lifecycle.throw(reason, context.result);
    }
  }
}

/**
 * @param iterable
 * @param lifecycle
 * @experimental
 * @internal
 */
export function iterableLifecycle<T>(
    iterable: Iterable<T>,
    lifecycle: IterableLifecycle<T>
): Iterable<T> {
  return {
    [Symbol.iterator]() {
      const context: SyncIteratorLifecycleContext<T> = {
        done: false,
        iterator: iterable[Symbol.iterator](),
        lifecycle
      };
      const lifecycleIterator: IterableLifecycleIterator<unknown> = iterateLifecycle(context)[Symbol.iterator]();
      const iterator: Iterator<T, unknown, unknown> =  {
        next(returned: unknown): IteratorResult<T> {
          context.returned = returned;
          const lifecycleResult = lifecycleIterator.next();
          if (!isIteratorYieldResult(lifecycleResult)) {
            return { done: true, value: undefined };
          }
          const result = lifecycleResult.value;
          if (isIteratorResult(result)) {
            if (isIteratorYieldResult<T>(result)) {
              return context.result = result;
            } else if (result.done) {
              context.done = true;
            }
          }
          return iterator.next(returned);
        },
        return(returned: unknown) {
          context.returned = returned ?? context.returned;
          context.done = true;
          const result = lifecycleIterator.return();
          if (isIteratorResult<T>(result)) {
            return result;
          }
          return { done: true, value: undefined };
        },
        throw(reason: unknown) {
          context.done = true;
          const result = lifecycleIterator.throw(reason);
          if (isIteratorResult<T>(result)) {
            return result;
          }
          return { done: true, value: undefined };
        }
      }
      return iterator;
    }
  }
}


/**
 * @param iterable
 * @param lifecycle
 * @experimental
 * @internal
 */
export function asyncIterableLifecycle<T>(
    iterable: AsyncIterable<T>,
    lifecycle: IterableLifecycle<T>
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      const context: AsyncIteratorLifecycleContext<T> = {
        done: false,
        iterator: iterable[Symbol.asyncIterator](),
        lifecycle
      };
      const lifecycleIterator: IterableLifecycleIterator<unknown> = iterateLifecycle(context)[Symbol.iterator]();
      const iterator: AsyncIterator<T, unknown, unknown> =  {
        async next(returned: unknown): Promise<IteratorResult<T>> {
          context.returned = returned;
          const lifecycleResult = lifecycleIterator.next();
          if (!isIteratorYieldResult(lifecycleResult)) {
            return { done: true, value: undefined };
          }
          let result = lifecycleResult.value;
          if (isPromise(result)) {
            result = await result;
          }
          if (isIteratorResult(result)) {
            if (isIteratorYieldResult<T>(result)) {
              return context.result = result;
            } else if (result.done) {
              context.done = true;
            }
          }
          return iterator.next(returned);
        },
        async return(returned: unknown) {
          context.returned = returned ?? context.returned;
          context.done = true;
          const result = lifecycleIterator.return();
          if (isIteratorResult<T>(result)) {
            return result;
          }
          return { done: true, value: undefined };
        },
        async throw(reason: unknown) {
          context.done = true;
          const result = lifecycleIterator.throw(reason);
          if (isIteratorResult<T>(result)) {
            return result;
          }
          return { done: true, value: undefined };
        }
      }
      return iterator;
    }
  }
}

