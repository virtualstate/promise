/* c8 ignore start */

import {sleep} from "./sleep";

export const inputs: PromiseArgs<unknown>[] = [
    [],
    [Promise.resolve(1)],
    [Promise.resolve(1), () => Promise.reject(1), Promise.resolve(1)],
    [[Promise.resolve(1)], () => Promise.reject(1), [Promise.resolve(1)], () => Promise.reject(1)],
    [() => sleep(10, 1), () => sleep(5, 1), () => sleep(15).then(() => Promise.reject("15"))],
    [
        async function *() {
            yield 1;
            yield 2;
        },
        async function *() {
            yield 3;
            yield 4;
        },
        async function *() {
            yield 5;
            yield 6;
            await sleep(5);
            await Promise.reject(7);
        },
        async function() {
            await sleep(10);
            return 8 as const;
        }
    ]
];