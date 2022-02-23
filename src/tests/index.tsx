import {Promise} from "../index";
import {inputs} from "./input";

for (const input of inputs) {
    const getInput = () => input.map(value => typeof value === "function" ? value() : value);
    const promiseOutput = await Promise.allSettled(...getInput());
    console.log({ input });
    console.log({ promiseOutput });
    for await (const state of Promise.allSettled(...getInput())) {
        console.log({ state });
    }

    try {
        const allPromiseOutput = await Promise.all(...getInput());
        console.log({ allPromiseOutput })
    } catch (allPromiseReason) {
        console.log({ allPromiseReason });
    }

    try {
        for await (const state of Promise.all(...getInput())) {
            console.log({ state })
        }
    } catch (allPromiseReason) {
        console.log({ allPromiseReason });
    }
}