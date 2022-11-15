import {Push, PushIteratorYieldResult, PushOptions} from "../push";
import {isIteratorYieldResult} from "../is";
import {ok} from "../like";

const Pointer = Symbol.for("@virtualstate/promise/Push/asyncIterator/pointer");

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

    constructor(options?: Omit<PushOptions, "keep">) {
        super({
            keep: true,
            ...options
        });
    }

    [Symbol.asyncIterator] = (): LineIterator<T> => {
        const { values } = this;
        const iterator = asyncIterator.call(this,{
            [Pointer]: true
        });

        const pointers: object[] = [];

        let index: number = -1;
        let done = false;

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
                    index = pointers.length;
                    return { done: true, value: undefined };
                }
                const result = await iterator.next();
                if (done) {
                    index = pointers.length;
                    // done set while getting next
                    return { done: true, value: undefined };
                }
                if (isPushIteratorResult(result)) {
                    const pointer = result[Pointer];
                    ok(pointer);
                    // The current length matches the next index
                    index = pointers.length;
                    pointers.push(pointer);
                } else if (result.done) {
                    done = true;
                    index = pointers.length;
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
            return(value) {
                done = true;
                index = pointers.length;
                return iterator.return?.(value);
            },
            async * [Symbol.asyncIterator]() {
                let result;
                do {
                    result = await this.next();
                    if (isIteratorYieldResult<T>(result)) {
                        yield result.value
                    }
                } while (!result.done);
            }
        }

    }


}