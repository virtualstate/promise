import {sleep} from "./sleep";

export const inputs: ((PromiseArg<unknown> | (() => PromiseArg<unknown>))[] )[] = [
    [],
    [Promise.resolve(1)],
    [Promise.resolve(1), () => Promise.reject(1), Promise.resolve(1)],
    [[Promise.resolve(1)], () => Promise.reject(1), [Promise.resolve(1)], () => Promise.reject(1)],
    [() => sleep(10), () => sleep(5), () => sleep(15).then(() => Promise.reject("15"))]
];