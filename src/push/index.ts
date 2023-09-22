import { WeakLinkedList } from "./weak-linked-list";
import { defer, Deferred } from "../defer";
import { ok } from "../like";
import {anAsyncThing} from "../the-thing";

const Pointer = Symbol.for("@virtualstate/promise/Push/asyncIterator/pointer");

export interface PushAsyncIterableIterator<T> extends AsyncIterableIterator<T> {
  clone(): PushAsyncIterableIterator<T>
}

export interface PushAsyncIteratorOptions extends Record<symbol, unknown> {
  /**
   * @internal
   */
  [Pointer]?: boolean | object
}

export interface PushFn<T> extends Push<T>, Promise<T> {
  (value: T): unknown;
}

export type PushIteratorYieldResult<T> = IteratorYieldResult<T> & Record<symbol, unknown>
export type PushIteratorResult<T> = IteratorResult<T> | PushIteratorYieldResult<T>

export function p<T>(options?: PushOptions): PushFn<T> {
  return createPushFn(options);
}

export function createPushFn<T>(options?: PushOptions) {
  const target = new Push<T>(options);
  const async = anAsyncThing(target);
  const unknown: object = function push(value: T) {
    return target.push(value);
  }
  define(unknown);
  return unknown;

  function define(push: object): asserts push is PushFn<T> {
    Object.defineProperties(push, {
      [Symbol.asyncIterator]: {
        value: target[Symbol.asyncIterator].bind(target)
      },
      push: {
        value: target.push.bind(target)
      },
      close: {
        value: target.close.bind(target)
      },
      throw: {
        value: target.throw.bind(target)
      },
      break: {
        value: target.break.bind(target)
      },
      active: {
        get() {
          return target.active;
        }
      },
      open: {
        get() {
          return target.open;
        }
      },
      then: {
        value: async.then.bind(async)
      },
      catch: {
        value: async.catch.bind(async)
      },
      finally: {
        value: async.finally.bind(async)
      }
    })
  }


}

export interface PushOptions {
  keep?: boolean;
}

interface PushPair<T = unknown> {
  deferred: Deferred<T>;
  waiting: Deferred;
}

export interface PushWriter<T = unknown> {
  readonly active?: boolean;
  readonly open?: boolean;
  push(value: T): unknown;
  throw?(reason?: unknown): unknown;
  close?(): unknown;
  break?(): unknown;
  wait?(): Promise<void>;
}

export class Push<T = unknown> implements AsyncIterable<T>, PushWriter<T> {
  /**
   * @internal
   * @protected
   */
  protected values = new WeakLinkedList<PushPair<T>>();

  /**
   * @internal
   * @protected
   */
  protected pointer: object = {};
  /**
   * @internal
   * @private
   */
  private previous: object | undefined = undefined;
  /**
   * @internal
   * @private
   */
  private closed: object | undefined = undefined;
  /**
   * @internal
   * @private
   */
  private complete = false;
  /**
   * @internal
   * @private
   */
  private microtask: object | undefined = undefined;

  /**
   * @internal
   * @private
   */
  private hold: object;

  /**
   * @internal
   * @private
   */
  private get resolvedPointer() {
    // Setting hold to undefined clears the initial pointer
    // available meaning this push instance's weak list can
    // start to forget deferred values
    //
    // If a pointer is available in sameMicrotask, or
    // an iterator as a pointer still, the pointers
    // value will still be available
    return this.hold ?? this.microtask ?? this.pointer;
  }

  /**
   * @internal
   * @protected
   */
  protected get resolvedPointers() {
    const pointers = [];
    let pointer = this.resolvedPointer;
    ok(pointer)
    let result
    do {
      result = this.values.get(pointer);
      if (result.next) {
        pointers.push(pointer);
        pointer = result.next;
      } else {
        pointer = undefined;
      }
    } while (pointer);
    return pointers;
  }

  // async iterators count is just a possible number, it doesn't
  // represent what is actually available in memory
  // some iterators may be dropped without reducing this value
  /**
   * @internal
   * @private
   */
  private asyncIterators: number = 0;

  get active() {
    return this.open && this.asyncIterators > 0;
  }

  get open() {
    return !(this.closed ?? this.complete);
  }

  constructor(private options?: PushOptions) {
    this.hold = this.pointer;
    this._nextDeferred();
  }

  async wait() {
    const { values, pointer } = this;
    const {
      value: { waiting },
    } = values.get(pointer);
    return waiting.promise;
  }

  push(value: T): unknown {
    ok(this.open, "Already closed");
    const { values, pointer } = this;
    const {
      value: { deferred, waiting },
    } = values.get(pointer);
    this.previous = pointer;
    this.pointer = {};
    this._nextDeferred();
    deferred.resolve(value);
    if (this.active) {
      return waiting.promise;
    } else {
      return Promise.resolve();
    }
  }

  throw(reason?: unknown): unknown {
    if (!this.open) return;
    const wasActive = this.active;
    const { values, pointer } = this;
    this.closed = pointer;
    const {
      value: { deferred, waiting },
    } = values.get(pointer);
    deferred.reject(reason);
    if (wasActive) {
      return waiting.promise;
    } else {
      return Promise.resolve();
    }
  }

  break() {
    this.complete = true;
    if (!this.open) return;
    const wasActive = this.active;
    const { values, pointer } = this;
    this.closed = pointer;
    const {
      value: { deferred, waiting },
    } = values.get(pointer);
    deferred.resolve(undefined);
    if (wasActive) {
      return waiting.promise;
    } else {
      return Promise.resolve();
    }
  }

  close(): unknown {
    if (!this.open) return;
    const wasActive = this.active;
    const { values, pointer } = this;
    this.closed = pointer;
    const {
      value: { deferred, waiting },
    } = values.get(pointer);
    deferred.resolve(undefined);
    if (wasActive) {
      return waiting.promise;
    } else {
      return Promise.resolve();
    }
  }

  private _nextDeferred = () => {
    const deferred = defer<T>();
    const waiting = defer();
    const { values, pointer, previous } = this;
    values.insert(previous, pointer, { deferred, waiting });
    if (!this.active) {
      void deferred.promise.catch((error) => void error);
    }
    // If we have no other pointers in this microtask
    // we will queue a task for them to be cleared
    // This allows for fading of pointers on a task by task
    // basis, while not keeping them around longer than they
    // need to be
    //
    // An async iterator created in the same microtask as a pointer
    // will be able to access that pointer
    if (!this.microtask) {
      this.microtask = pointer;
      queueMicrotask(() => {
        if (this.microtask === pointer) {
          this.microtask = undefined;
        }
      });
    }
  };

  [Symbol.asyncIterator](options?: PushAsyncIteratorOptions): AsyncIterableIterator<T> {
    let pointer = this.resolvedPointer;

    let optionsPointer = options?.[Pointer];
    if (typeof optionsPointer === "object" && this.values.has(optionsPointer)) {
      pointer = optionsPointer;
    }
    if (optionsPointer) {
      // Don't keep the external pointer if we don't need to
      optionsPointer = true;
    }

    this.asyncIterators += 1;
    if (!this.options?.keep) {
      this.hold = undefined;
    }
    const values = this.values;
    const resolved = new WeakSet();

    const next = async (): Promise<PushIteratorResult<T>> => {
      if (this.complete || !pointer || pointer === this.closed) {
        return clear();
      }
      if (resolved.has(pointer)) {
        const result = this.values.get(pointer);
        ok(result.next, "Expected next after deferred resolved");
        pointer = result.next;
      }
      const {
        value: { deferred, waiting },
      } = values.get(pointer);
      waiting.resolve();
      const value = await deferred.promise;
      if (this.complete || pointer === this.closed) {
        return clear();
      }
      resolved.add(pointer);
      const result: PushIteratorYieldResult<T> = { done: false, value };
      if (optionsPointer) {
        result[Pointer] = pointer;
      }
      return result;
    };

    const clear = (): IteratorResult<T> => {
      this.asyncIterators -= 1;
      if (!this.active && !this.options?.keep) {
        this.closed = undefined;
        this.complete = true;
      }

      function resolveWaiting(pointer: object): void {
        const item = values.get(pointer);
        if (!item) return;
        const {
          value: { waiting },
          next,
        } = item;
        waiting.resolve(undefined);
        if (!next) return;
        return resolveWaiting(next);
      }

      if (pointer) {
        resolveWaiting(pointer);
        pointer = undefined;
      }
      return { done: true, value: undefined };
    };

    function getClone(source: AsyncIterableIterator<T>): PushAsyncIterableIterator<T> {
      return {
        next() {
          return source.next()
        },
        async return() {
          // Explicitly not finishing the core iterable as this is a clone
          return { done: true, value: undefined }
        },
        [Symbol.asyncIterator]() {
          return iterator;
        },
        clone() {
          // We could return iterator here, but better to give a new
          // instance which is what would be expected here.
          return getClone(source);
        }
      }
    }

    const iterator: PushAsyncIterableIterator<T> = {
      next,
      async return() {
        return clear();
      },
      [Symbol.asyncIterator]() {
        return iterator;
      },
      clone() {
        return getClone(iterator);
      }
    };

    return iterator;
  }
}
