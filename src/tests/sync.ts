
import {aSyncThing, TheSyncThing} from "../the-sync-thing";
import {isIteratorYieldResult} from "../is";
import {anAsyncThing} from "../the-thing";

async function withThing(thing: TheSyncThing<Iterable<number>>) {
    function runSync() {
        const [one, two, three, ...rest] = thing;
        console.log({ one, two, three, rest });
    }
    async function run() {
        const [one, two, three, ...rest] = await thing;
        console.log({ one, two, three, rest });
    }
    async function runAsync() {
        const [one, two, three, ...rest] = await anAsyncThing(thing);
        console.log({ one, two, three, rest });
    }

    runSync();
    await run();
    await runAsync();

    console.log([ ...thing ]);


    async function forAwait() {

        const result = await thing[Symbol.asyncIterator]().next();

        if (isIteratorYieldResult(result)) {
            console.log(result.value);
            for (const next of result.value) {
                console.log({ next });
            }
        }
        for await (const snapshot of thing) {
            for (const next of snapshot) {
                console.log({ next });
            }
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

await withThing(aSyncThing([1, 2, 3, 4]));

console.log("async sync:");
for await (const asyncSync of anAsyncThing([1, 2, 3, 4, 5] as const)) {
    await withThing(aSyncThing(asyncSync));
}