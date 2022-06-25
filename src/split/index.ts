import {anAsyncThing, TheAsyncThing} from "../the-thing";
import {Push, PushOptions} from "../push";
import {ok} from "../like";

type Name = unknown;

export interface SplitOptions<T> extends PushOptions {
   name?(value: T): Name;
}

export interface FilterFn<T> {
    (value: T): boolean
}
export interface FilterIsFn<T, Z extends T> {
    (value: T): value is Z
}

export interface Split<T> extends Iterable<TheAsyncThing<T>>, AsyncIterable<T[]> {
    filter(value: FilterFn<T>): Split<T>
    filter<Z extends T>(value: FilterIsFn<T, Z>): Split<Z>
    filter<Z>(value: FilterIsFn<unknown, Z>): Split<Z>
    named(name: Name): Split<T>
}

function identity(value: unknown) {
    return value;
}

export function split<T>(input: AsyncIterable<T[]>, options?: SplitOptions<T>): Split<T> {
    const targets: Push<T>[] = [],
        filter = new Map<FilterFn<T>, Push<T[]>>(),
        splits = new Map<FilterFn<T>, Split<T>>(),
        namedFilter = new Map<Name, FilterFn<T>>();

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

    function getAsyncIterableOutput<Z>(target: Push<Z>): AsyncIterable<Z> {
        return {
            async *[Symbol.asyncIterator]() {
                const promise = start();
                yield * target;
                await promise;
            }
        };
    }
    function getOutput<Z>(target: Push<Z>): TheAsyncThing<Z> {
        return anAsyncThing(
            getAsyncIterableOutput(target)
        );
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

    return new class Split<Z extends T> implements Split<Z> {

        async *[Symbol.asyncIterator]() {
          mainTarget = mainTarget ?? new Push(options);
          yield * getAsyncIterableOutput(mainTarget);
        }

        [Symbol.iterator]() {
            function * withIndex(index: number): Iterable<TheAsyncThing<T>> {
                yield getTarget(index);
                yield * withIndex(index + 1);
            }
            return withIndex(0)[Symbol.iterator]();
        }

        filter(fn: FilterFn<T>) {
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

        named(name: Name) {
            let nameFn = namedFilter.get(name);
            if (!nameFn) {
                const getName = options?.name ?? identity;
                nameFn = (value) => {
                    return getName(value) === name
                };
                namedFilter.set(name, nameFn);
            }
            return this.filter(nameFn);
        }
    }
}