import {anAsyncThing, TheAsyncThing} from "./the-thing";
import {union} from "@virtualstate/union";

export function allSettled<T>(...promises: PromiseArgs<T>): TheAsyncThing<PromiseSettledResult<T>[]> {
    return anAsyncThing(allSettledGenerator(...promises));
}

export async function *allSettledGenerator<T>(...promises: PromiseArgs<T>): AsyncIterable<PromiseSettledResult<T>[]> {
    const input = promises.flatMap(value => value);
    type KnownPromiseResult = [number, PromiseSettledResult<T>];
    const knownPromises = [...input].map(async function *(promise, index): AsyncIterable<KnownPromiseResult> {
        try {
            const value = await promise;
            yield [index, { value, status: "fulfilled" }];
        } catch (reason) {
            yield [index, { reason, status: "rejected" }];
        }
    });
    const results = Array.from<PromiseSettledResult<T>>({ length: input.length });
    for await (const state of union(knownPromises)) {
        for (const item of state) {
            if (!item) continue;
            const [index, result] = item;
            results[index] = result;
        }
        yield results;
    }
}