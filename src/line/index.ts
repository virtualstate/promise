import {Push, PushAsyncIteratorOptions, PushIteratorYieldResult, PushOptions} from "../push";
import {isIteratorYieldResult} from "../is";
import {ok} from "../like";

const Pointer = Symbol.for("@virtualstate/promise/Push/asyncIterator/pointer");
const ReverseAsyncIterator = Symbol.for("@virtualstate/promise/Push/reverseAsyncIterator");

function isPushIteratorResult<T>(value: unknown): value is PushIteratorYieldResult<T> & { [Pointer]?: object } {
    return isIteratorYieldResult(value);
}

const asyncIterator = Push.prototype[Symbol.asyncIterator];

export interface LineIterator<T> extends AsyncIterableIterator<T> {
    previous(): Promise<IteratorResult<T>>
}

/**
 * @experimental
 */
export class Line<T = unknown> extends Push<T> {

    static reverse<R = unknown>(line: Line<R>) {
        return line[ReverseAsyncIterator]();
    }

    constructor(options?: Omit<PushOptions, "keep">) {
        super({
            keep: true,
            ...options
        });
    }

    [ReverseAsyncIterator] = (): AsyncIterableIterator<T> => {
        let iterator: LineIterator<T>;
        const line = this;
        return {
            async next() {
                if (!iterator) {
                    iterator = line[Symbol.asyncIterator]();
                    let result;
                    do {
                        // "Load" our iterator... yeah, we want to reach the end.
                        // If we never reach the end, we can not read from the end
                        // This only applies to async iterators
                        //
                        // If you don't want to go through this loading and manually
                        // control the cycle of the iterator,
                        result = await iterator.next();
                    } while (!result.done);
                }
                return iterator.previous();
            },
            async return() {
                return iterator?.return?.();
            },
            async *[Symbol.asyncIterator]() {
                let result;
                do {
                    result = await this.next();
                    if (isIteratorYieldResult<T>(result)) {
                        yield result.value;
                    }
                } while (!result.done);
                await this.return?.();
            }
        }
    }

    [Symbol.asyncIterator] = (options?: PushAsyncIteratorOptions): LineIterator<T> => {
        const { values } = this;
        let iterator: AsyncIterator<T>;

        const pointers: object[] = [];

        let index: number = -1;
        let done = false;

        // If we are already closed, we can make a jump
        /**
         * @experimental it works though
         */
        if (!this.open) {
            pointers.push(...this.resolvedPointers);
            index = -2;
            done = true;
        } else {
            iterator = asyncIterator.call(this,{
                [Pointer]: true,
                ...options
            })
        }

        function getIndexDeferred(index: number) {
            const pointer = pointers[index];
            if (pointer) {
                const {
                    value: {
                        deferred
                    }
                } = values.get(pointer);
                ok(deferred);
                ok(deferred.settled);
                ok(deferred.status === "fulfilled");
                return deferred;
            }
        }

        return {
            async next() {
                if (index !== -1) {
                    let nextIndex;
                    // -2 means we got to the start again, so lets try from
                    // the start of the list
                    if (index === -2) {
                        nextIndex = 0;
                    } else {
                        nextIndex = index + 1;
                    }
                    const deferred = getIndexDeferred(nextIndex);
                    if (deferred) {
                        index = nextIndex;
                        const value = await deferred.promise;
                        return {
                            value,
                            done: false
                        }
                    }
                    // If we don't have a deferred, we are adding to the end
                }
                if (done) {
                    return this.return();
                }
                const result = await iterator.next();
                if (result.done) {
                    done = true;
                }
                if (done) {
                    return this.return();
                }
                if (isPushIteratorResult(result)) {
                    const pointer = result[Pointer];
                    ok(pointer);
                    // The current length matches the next index
                    index = pointers.length;
                    pointers.push(pointer);
                }
                return result;
            },
            async previous() {
                const nextIndex = index - 1;
                const deferred = getIndexDeferred(nextIndex);
                if (!deferred) {
                    // Mark that we tried to go further backwards than available
                    index = -2;
                    return { done: true, value: undefined };
                }
                index = nextIndex;
                const value = await deferred.promise;
                return {
                    value,
                    done: false
                };
            },
            async return() {
                done = true;
                index = pointers.length;
                if (iterator?.return) {
                    await iterator.return();
                }
                iterator = undefined;
                return { done: true, value: undefined }
            },
            async * [Symbol.asyncIterator]() {
                let result;
                do {
                    result = await this.next();
                    if (isIteratorYieldResult<T>(result)) {
                        yield result.value
                    }
                } while (!result.done);
                await this.return();
            }
        }

    }


}