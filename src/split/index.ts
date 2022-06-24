import {anAsyncThing, TheAsyncThing} from "../the-thing";
import {Push} from "../push";
import {ok} from "../like";

export function split<T>(input: AsyncIterable<T[]>): Iterable<TheAsyncThing<T>> {
    const targets: Push<T>[] = [],
        outputs: TheAsyncThing<T>[] = [];

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
                for (const [index, value] of Object.entries(snapshot)) {
                    targets[+index]?.push(value);
                }
            }
            for (const target of targets) {
                target.close();
            }
        } catch (error) {
            for (const target of targets) {
                target.throw(error);
            }
        }
        done = true;
    }

    function getTarget(index: number) {
        const existing = outputs[index]
        if (existing) {
            return existing;
        }
        const target = new Push<T>();
        targets[index] = target;
        const output = anAsyncThing({
            async *[Symbol.asyncIterator]() {
                const promise = start();
                yield * target;
                await promise;
            }
        });
        outputs[index] = output;
        return output;
    }

    return {
        [Symbol.iterator]() {
            function * withIndex(index: number): Iterable<TheAsyncThing<T>> {
                yield getTarget(index);
                yield * withIndex(index + 1);
            }
            return withIndex(0)[Symbol.iterator]();
        }
    }
}