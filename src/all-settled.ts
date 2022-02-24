import {anAsyncThing, TheAsyncThing} from "./the-thing";
import {union} from "@virtualstate/union";

export function allSettled<T, TArgs extends  PromiseArgTuple<T>>(this: unknown, ...promises: TArgs): TheAsyncThing<PromiseSettledTuple<TArgs>>
export function allSettled<T>(...promises: PromiseArgs<T>): TheAsyncThing<PromiseSettledResult<T>[]>
export function allSettled<T>(...promises: PromiseArgs<T>): TheAsyncThing {
    return anAsyncThing(allSettledGenerator(...promises));
}

export function allSettledGenerator<T, TArgs extends  PromiseArgTuple<T>>(this: unknown, ...promises: TArgs): AsyncIterable<PromiseSettledTuple<TArgs>>
export function allSettledGenerator<T>(...promises: PromiseArgs<T>): AsyncIterable<PromiseSettledResult<T>[]>
export async function *allSettledGenerator<T>(...promises: PromiseArgs<T>): AsyncIterable<unknown> {
    type KnownPromiseResult = [number, PromiseSettledResult<T>];
    const input = promises.flatMap(value => value).map((promise, index) => (
        promise
            .then((value): KnownPromiseResult  => [index, { value, status: "fulfilled" }])
            .catch((reason): KnownPromiseResult => [index, { reason, status: "rejected" }])
    ));
    const knownPromises = [...input].map(async function *(promise) {
        yield promise;
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