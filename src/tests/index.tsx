import {allSettled} from "../all-settled";
import {all} from "../all";

function sleep(timeout: number, arg?: unknown) {
    return new Promise(resolve => setTimeout(resolve, timeout, arg ?? `Slept ${timeout} ms`));
}

const inputs: ((PromiseArg<unknown> | (() => PromiseArg<unknown>))[])[] = [
    [],
    [Promise.resolve(1)],
    [Promise.resolve(1), Promise.reject(1), Promise.resolve(1)],
    [[Promise.resolve(1), Promise.reject(1)], [Promise.resolve(1)], Promise.reject(1)],
    [() => sleep(10), () => sleep(5), () => sleep(15).then(() => Promise.reject("15"))]
];

for (const input of inputs) {
    const getInput = () => input.map(value => typeof value === "function" ? value() : value);
    const promiseOutput = await allSettled(...getInput());
    console.log({ input });
    console.log({ promiseOutput });
    for await (const state of allSettled(...getInput())) {
        console.log({ state });
    }

    try {
        const allPromiseOutput = await all(...getInput());
        console.log({ allPromiseOutput })
    } catch (allPromiseReason) {
        console.log({ allPromiseReason });
    }

    try {
        for await (const state of all(...getInput())) {
            console.log({ state })
        }
    } catch (allPromiseReason) {
        console.log({ allPromiseReason });
    }
}