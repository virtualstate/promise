import { WeakLinkedList } from "./weak-linked-list";
import { defer, Deferred } from "../defer";
import { ok } from "../like";

export interface PushOptions {
  keep?: boolean;
}

interface PushPair<T> {
  deferred: Deferred<T>;
  waiting: Deferred;
}

export class Push<T> implements AsyncIterable<T> {
  private values = new WeakLinkedList<PushPair<T>>();

  private pointer: object = {};
  private previous: object | undefined = undefined;
  private closed: object | undefined = undefined;
  private complete = false;
  private microtask: object | undefined = undefined;

  private hold: object;

  // async iterators count is just a possible number, it doesn't
  // represent what is actually available in memory
  // some iterators may be dropped without reducing this value
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

  [Symbol.asyncIterator](): AsyncIterator<T> {
    // Setting hold to undefined clears the initial pointer
    // available meaning this push instance's weak list can
    // start to forget deferred values
    //
    // If a pointer is available in sameMicrotask, or
    // an iterator as a pointer still, the pointers
    // value will still be available
    let pointer = this.hold ?? this.microtask ?? this.pointer;
    this.asyncIterators += 1;
    if (!this.options?.keep) {
      this.hold = undefined;
    }
    const values = this.values;
    const resolved = new WeakSet();

    const next = async (): Promise<IteratorResult<T>> => {
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
      return { done: false, value };
    };

    const clear = (): IteratorResult<T> => {
      this.asyncIterators -= 1;
      if (!this.active) {
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

    return {
      next,
      async return() {
        return clear();
      },
    };
  }
}
