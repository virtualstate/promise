import { WeakLinkedList } from "./weak-linked-list";
import { defer, Deferred } from "../defer";
import { ok } from "../like";

export interface PushOptions {
  keep?: boolean
}

export class Push<T> implements AsyncIterable<T> {
  private values = new WeakLinkedList<Deferred<T>>();
  private pointer: object = {};
  private previous: object | undefined = undefined;
  private closed: object | undefined = undefined;
  private wait = defer();
  private microtask: Promise<void> | undefined = undefined;
  private sameMicrotask: object[] = [];

  private hold: object;

  constructor(private options?: PushOptions) {
    this.hold = this.pointer;
    this._nextDeferred();
  }

  push(value: T) {
    ok(!this.closed, "Already closed");
    const current = this.values.get(this.pointer);
    this.previous = this.pointer;
    this.pointer = {};
    this._nextDeferred();
    current.value.resolve(value);
    this.wait.resolve();
    this.wait = defer();
  }

  throw(reason?: unknown) {
    ok(!this.closed, "Already closed");
    this.closed = this.pointer;
    const current = this.values.get(this.pointer);
    current.value.reject(reason);
  }

  close() {
    ok(!this.closed, "Already closed");
    this.closed = this.pointer;
    const current = this.values.get(this.pointer);
    current.value.resolve(undefined);
  }

  private _nextDeferred = () => {
    const deferred = defer<T>();
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
        this.hold ?? (
                this.sameMicrotask.includes(this.pointer)
                    ? this.sameMicrotask[0]
                    : this.pointer
            )
        ;
    if (!this.options?.keep) {
      this.hold = undefined;
    }
    const values = this.values;
    const resolved = new WeakSet();

    const next = async (): Promise<IteratorResult<T>> => {
      if (!pointer || pointer === this.closed) {
        return { done: true, value: undefined };
      }
      if (resolved.has(pointer)) {
        const result = this.values.get(pointer);
        ok(result.next, "Expected next after deferred resolved");
        pointer = result.next;
      }
      const { value: deferred } = values.get(pointer);
      const value = await deferred.promise;
      if (pointer === this.closed) {
        return { done: true, value: undefined };
      }
      resolved.add(pointer);
      return { done: false, value };
    };

    return {
      next,
      async return() {
        pointer = undefined;
        return { done: true, value: undefined };
      },
    };
  }
}
