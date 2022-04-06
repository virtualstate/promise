/* c8 ignore start */
import {createDownstreamGenerator, Push} from "../downstream";
import {union} from "@virtualstate/union";

async function *create() {

    const a = (async function * () {
        console.log("index:a start");
        for (let i = 0; i <= 10; i += 1) {
            yield i;
            await new Promise(resolve => setTimeout(resolve, 100 * Math.random()));
        }
        console.log("index:a fin");
    })();
    const b = (async function * () {
        console.log("index:b start");
        for (let i = 0; i <= 40; i += 1) {
            yield i;
            await new Promise(resolve => setTimeout(resolve, 100 * Math.random()));
        }
        console.log("index:b fin");
    })();
    const c = (async function * () {
        console.log("index:c start");
        for (let i = 0; i <= 20; i += 1) {
            yield i;
            await new Promise(resolve => setTimeout(resolve, 100 * Math.random()));
        }
        console.log("index:c fin");
    })();
    const d = (async function * () {
        console.log("index:d start");
        for (let i = 0; i <= 30; i += 1) {
            yield i;
            await new Promise(resolve => setTimeout(resolve, 100 * Math.random()));
        }
        console.log("index:d fin");
    })();

    yield [a, b, c, d];
    await new Promise(resolve => setTimeout(resolve, 100));
    yield [a, b, (async function * () {
        console.log("index:1:2 start");
        for (let i = 0; i <= 4; i += 1) {
            yield i;
            await new Promise(resolve => setTimeout(resolve, 100 * Math.random()));
        }
        console.log("index:1:2 fin");
    })()];
    console.log("fin");

}
console.log("==== start")

const push = new Push<AsyncIterable<unknown>>();

async function *yielding() {
    push.push((async function *() {
        console.log("1");
        yield 1;
        console.log("fin 1");
    })())
    push.push((async function *() {
        console.log("2");
        yield 2;
        console.log("fin 2");
    })());
    await new Promise(resolve => setTimeout(resolve, 10));
    push.push((async function *() {
        console.log("3");
        // await new Promise(resolve => setTimeout(resolve, 1));
        yield 3;
        console.log("fin 3");
    })());
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log("closing")
    push.close();
    yield 1;
    console.log("finished");
}


debugger;

async function *unionPush() {
    console.log("union push start");
    for await (const snapshot of union(push)) {
        console.log("union push snapshot");
        yield snapshot;
        console.log("union push snapshot next");
    }
    console.log("union push done");
}


for await (const snapshot of union<unknown>([yielding(), unionPush()])) {
    console.log({ snapshot });
}

console.log("=== start next")

for await (const snapshot of createDownstreamGenerator(create())) {
    console.log({ snapshot });
}

console.log("==== done")