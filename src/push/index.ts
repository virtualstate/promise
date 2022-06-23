import { WeakLinkedList } from "./weak-linked-list";
import { defer, Deferred } from "../defer";
import {ok} from "../like";

export class Push<T> implements AsyncIterable<T> {

    private values = new WeakLinkedList<Deferred<T>>();
    private pointer: object = {};
    private previous: object | undefined = undefined;
    private closed: object | undefined = undefined;
    private wait = defer();
    private microtask: Promise<void> | undefined = undefined;
    private sameMicrotask: object[] = [];

    constructor() {
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

    close() {
        ok(!this.closed, "Already closed");
        this.closed = this.pointer;
        const current = this.values.get(this.pointer);
        current.value.resolve(undefined);
    }

    private _nextDeferred = () => {
        const deferred = defer<T>();
        this.values.insert(this.previous, this.pointer, deferred);
        void deferred.promise.catch(error => void error);
        this.sameMicrotask.push(this.pointer);
        if (!this.microtask) {
            this.microtask = (async () => {
                await new Promise<void>(queueMicrotask);
                this.sameMicrotask = [];
                this.microtask = undefined;
            })();
        }
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        let pointer = this.sameMicrotask[0] ?? this.pointer;
        const values = this.values;
        const resolved = new WeakSet();

        const next = async (): Promise<IteratorResult<T>> => {
            if (!pointer || pointer === this.closed) {
                return { done: true, value: undefined }
            }
            if (resolved.has(pointer)) {
                const result = this.values.get(pointer);
                ok(result.next, "Expected next after deferred resolved");
                pointer = result.next
            }
            const { value: deferred } = values.get(pointer);
            const value = await deferred.promise;
            if (pointer === this.closed) {
                return { done: true, value: undefined };
            }
            resolved.add(pointer);
            return { done: false, value };
        }

        return {
            next,
            async return() {
                pointer = undefined;
                return { done: true, value: undefined }
            }
        }
    }
}
