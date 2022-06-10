
import {aSyncThing, TheSyncThing} from "../the-sync-thing";
import {isIteratorYieldResult} from "../is";
import {anAsyncThing} from "../the-thing";

async function withThing(thing: TheSyncThing) {
    async function run() {

        const one = await thing;
        const two = await thing;
        const three = await thing;

        const done = await thing;

        console.log({ one, two, three, done });
    }

    await run();
    await run();

    async function aWhile() {
        let next;
        while (next = await thing) {
            console.log({ next });
        }
    }

    await aWhile();
    await aWhile();
    async function aWhileNext() {
        let next, result;
        while ((result = thing.next()) && isIteratorYieldResult(result) && (next = result.value)) {
            console.log({ next });
        }
    }

    await aWhileNext();
    await aWhileNext();

    console.log([ ...thing ]);

    async function forAwait() {
        for await (const next of thing) {
            console.log({ next });
        }
    }

    async function forSync() {
        for (const next of thing) {
            console.log({ next });
        }
    }

    await forAwait();
    await forSync();
    await forAwait();
    await forSync();
}

await withThing(aSyncThing([1, 2, 3]));
const source = {
    value: 0,
    max: 10,
    next(): IteratorResult<number> {
        const value = source.value;
        if (value >= source.max) {
            return { value: undefined, done: true }
        } else {
            source.value += 1;
            return { value, done: false };
        }
    },
    return(): IteratorResult<number> {
        source.value = 0;
        return { done: true, value: undefined };
    }
};

await withThing(aSyncThing(source));

console.log("async sync:");
for await (const asyncSync of anAsyncThing([1, 2, 3] as const)) {
    await withThing(aSyncThing(asyncSync));
}