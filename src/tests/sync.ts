
import {aSyncThing, TheSyncThing} from "../the-sync-thing";
import {isIterable, isIteratorYieldResult} from "../is";
import {anAsyncThing} from "../the-thing";
import {ok} from "../like";

async function withThing(thing: TheSyncThing<number>) {
    function runSync() {
        const [one, two, three, ...rest] = thing;
        console.log({ one, two, three, rest });
    }
    async function run() {
        const [one, two, three, ...rest] = await thing;
        console.log({ one, two, three, rest });
    }
    async function runPromise() {
        const [one, two, three, ...rest] = await new Promise<Iterable<number>>(
            (resolve, reject) => thing.then(resolve, reject)
        );
        console.log({ one, two, three, rest });
    }
    async function runAsync() {
        const [one, two, three, ...rest] = await anAsyncThing(thing);
        console.log({ one, two, three, rest });
    }

    runSync();
    await run();
    await runPromise();
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
        for await (const snapshot of thing.async) {
            for (const next of snapshot) {
                console.log({ next });
            }
        }
    }

    function forSync() {
        for (const next of thing) {
            console.log({ next });
        }
    }

    await forAwait();
    forSync();
    await forAwait();
    forSync();
}

await withThing(aSyncThing([1, 2, 3, 4]));

console.log("async sync:");
for await (const asyncSync of anAsyncThing([1, 2, 3, 4, 5] as const)) {
    await withThing(aSyncThing(asyncSync));
}