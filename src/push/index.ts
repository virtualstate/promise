import { WeakLinkedList } from "./weak-linked-list";
import {defer, DeferOptions, Deferred} from "../defer";
import { ok } from "../like";

export interface PushOptions extends DeferOptions {
  keep?: boolean;
}

export class Push<T> implements AsyncIterable<T> {
  private values = new WeakLinkedList<Deferred<T>>();
  private pointer: object = {};
  private previous: object | undefined = undefined;
  private closed: object | undefined = undefined;
  private complete = false;
  private microtask: Promise<void> | undefined = undefined;
  private sameMicrotask: object[] = [];

  private hold: object;

  // async iterators count is just a possible number, it doesn't
  // represent what is actually available in memory
  // some iterators may be dropped without reducing this value
  private asyncIterators: number = 0;

  private queue: Promise<void> = Promise.resolve();

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
    const { value: deferred } = values.get(pointer);
    return deferred.waiting;
  }

  push(value: T): unknown {
    ok(this.open, "Already closed");
    const { value: deferred } = this.values.get(this.pointer);
    this.previous = this.pointer;
    this.pointer = {};
    this._nextDeferred();
    deferred.resolve(value);
    return deferred.waiting;
  }

  throw(reason?: unknown): unknown {
    ok(this.open, "Already closed");
    this.closed = this.pointer;
    const { value: deferred } = this.values.get(this.pointer);
    deferred.reject(reason);
    return deferred.waiting;
  }

  close(): unknown {
    ok(this.open, "Already closed");
    this.closed = this.pointer;
    const { value: deferred } = this.values.get(this.pointer);
    deferred.resolve(undefined);
    return deferred.waiting;
  }

  private _nextDeferred = () => {
    const deferred = defer<T>(this.options);
    this.values.insert(this.previous, this.pointer, deferred);
    void deferred.promise.catch((error) => void error);
    // If we have no other pointers in this microtask
    // we will queue a task for them to be cleared
    // This allows for fading of pointers on a task by task
    // basis, while not keeping them around longer than they
    // need to be
    //
    // An async iterator created in the same microtask as a pointer
    // will be able to access that pointer
    this.sameMicrotask.push(this.pointer);
    if (!this.microtask) {
      this.microtask = (async () => {
        await new Promise<void>(queueMicrotask);
        this.sameMicrotask = [];
        this.microtask = undefined;
      })();
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
    let pointer =
      this.hold ??
      (this.sameMicrotask.includes(this.pointer)
        ? this.sameMicrotask[0]
        : this.pointer);
    this.asyncIterators += 1;
    if (!this.options?.keep) {
      this.hold = undefined;
    }
    const values = this.values;
    const resolved = new WeakSet();

    const next = async (): Promise<IteratorResult<T>> => {
      if (!pointer || pointer === this.closed) {
        return clear();
      }
      if (resolved.has(pointer)) {
        const result = this.values.get(pointer);
        ok(result.next, "Expected next after deferred resolved");
        pointer = result.next;
      }
      const { value: deferred } = values.get(pointer);
      const value = await deferred.promise;
      if (pointer === this.closed) {
        return clear();
      }
      resolved.add(pointer);
      return { done: false, value };
    };

    const clear = (): IteratorResult<T> => {
      this.asyncIterators -= 1;
      if (!this.active) {
        this.complete = true;
      }
      pointer = undefined;
      return { done: true, value: undefined };
    }

    return {
      next,
      async return() {
        return clear();
      },
    };
  }
}
