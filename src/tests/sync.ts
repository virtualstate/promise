
import {aSyncThing} from "../the-sync-thing";
import {isIteratorYieldResult} from "../is";

const thing = aSyncThing([1, 2, 3]);

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