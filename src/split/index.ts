import {anAsyncThing, TheAsyncThing} from "../the-thing";
import {Push, PushOptions} from "../push";
import {ok} from "../like";

export interface SplitOptions extends PushOptions {

}

export interface FilterFn<T> {
    (value: T): boolean
}

export interface Split<T> extends Iterable<TheAsyncThing<T>>, AsyncIterable<T[]> {
    filter(value: FilterFn<T>): Split<T>
}

export function split<T>(input: AsyncIterable<T[]>, options?: SplitOptions): Split<T> {
    const targets: Push<T>[] = [],
        filter = new Map<FilterFn<T>, Push<T[]>>(),
        splits = new Map<FilterFn<T>, Split<T>>();

    let mainTarget: Push<T[]> | undefined = undefined;

    let done = false,
        started = false;

    let readPromise: Promise<void> | undefined = undefined;

    function start() {
        if (readPromise) return readPromise;
        readPromise = read();
        void readPromise.catch(error => void error);
        return readPromise;
    }

    async function read() {
        try {
            ok(!started);
            started = true;
            for await (const snapshot of input) {
                mainTarget?.push(snapshot)
                for (const [index, value] of Object.entries(snapshot)) {
                    targets[+index]?.push(value);

                }
                for (const [fn, target] of filter.entries()) {
                    const filtered = snapshot.filter(fn);
                    if (!filtered.length) continue;
                    target.push(filtered);
                }
            }
            mainTarget?.close();
            for (const target of targets) {
                target.close();
            }
            for (const target of filter.values()) {
                target.close();
            }
        } catch (error) {
            mainTarget?.throw(error);
            for (const target of targets) {
                target.throw(error);
            }
            for (const target of filter.values()) {
                target.throw(error);
            }
        }
        done = true;
    }

    function getOutput<Z>(target: Push<Z>): TheAsyncThing<Z> {
        return anAsyncThing({
            async *[Symbol.asyncIterator]() {
                const promise = start();
                yield * target;
                await promise;
            }
        });
    }

    function getTarget(index: number) {
        const existing = targets[index]
        if (existing) {
            return getOutput(existing);
        }
        const target = new Push<T>(options);
        targets[index] = target;
        return getOutput(target);
    }

    return {
        async *[Symbol.asyncIterator]() {
          mainTarget = mainTarget ?? new Push(options);
          const promise = start();
          yield * mainTarget;
          await promise;
        },
        [Symbol.iterator]() {
            function * withIndex(index: number): Iterable<TheAsyncThing<T>> {
                yield getTarget(index);
                yield * withIndex(index + 1);
            }
            return withIndex(0)[Symbol.iterator]();
        },
        filter(fn) {
            const existing = splits.get(fn);
            if (existing) {
                return existing;
            }
            const target = new Push<T[]>();
            filter.set(fn, target);
            const output = split(getOutput(target));
            splits.set(fn, output);
            return output;
        }
    }
}