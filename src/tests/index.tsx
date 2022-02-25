import {Promise, PromiseAllRejectEarly} from "../index";
import {GlobalPromise} from "./global";

await import("./ok");
await import("./the-thing");
await import("./readme");
await import("./typed");

const { inputs } = await import("./input");

for (const input of inputs) {
    const promiseOutput = await Promise.allSettled(...input);
    console.log({ input });
    console.log({ promiseOutput });
    for await (const state of Promise.allSettled(...input)) {
        console.log({ state });
    }

    try {
        const allPromiseOutput = await Promise.all(...input);
        console.log({ allPromiseOutput })
    } catch (allPromiseReason) {
        console.log({ allPromiseReason });
    }

    try {
        for await (const state of Promise.all(...input)) {
            console.log({ state })
        }
    } catch (allPromiseReason) {
        console.log({ allPromiseReason });
    }
}

await Promise.all.call({
    [PromiseAllRejectEarly]: true
}, (async () => {
    throw new Error()
})()).catch((reason: unknown) => reason);

await Promise.all(
    GlobalPromise.reject("message"),
    GlobalPromise.reject("message"),
).catch((reason: unknown) => reason);

await Promise.allSettled(
    // Not allowed
    (1 as unknown) as Promise<unknown>,
).catch((reason: unknown) => reason);