import {anAsyncThing, TheAsyncThing} from "./the-thing";
import {union} from "@virtualstate/union";
import {isAsyncIterable} from "./is";
import {PromiseArgs, PromiseArgTuple, PromiseOrAsync, PromiseSettledTuple } from "./args";

export function allSettled<T, TArgs extends  PromiseArgTuple<T>>(this: unknown, ...promises: TArgs): TheAsyncThing<PromiseSettledTuple<TArgs>>
export function allSettled<T>(...promises: PromiseArgs<T>): TheAsyncThing<PromiseSettledResult<T>[]>
export function allSettled<T>(...promises: PromiseArgs<T>): TheAsyncThing {
    return anAsyncThing(allSettledGenerator(...promises));
}

export function allSettledGenerator<T, TArgs extends  PromiseArgTuple<T>>(this: unknown, ...promises: TArgs): AsyncIterable<PromiseSettledTuple<TArgs>>
export function allSettledGenerator<T>(...promises: PromiseArgs<T>): AsyncIterable<PromiseSettledResult<T>[]>
export async function *allSettledGenerator<T>(...promises: PromiseArgs<T>): AsyncIterable<unknown> {
    type KnownPromiseResult = [number, PromiseSettledResult<T>];
    const input = promises.flatMap(value => value);
    const knownPromises = [...input].map(map);
    const results = Array.from<PromiseSettledResult<T>>({ length: input.length });
    let yielded = false;
    for await (const state of union(knownPromises)) {
        for (const item of state) {
            if (!item) continue;
            const [index, result] = item;
            results[index] = result;
        }
        // Copy out the results so that we don't give out access to this potentially shared array
        yield [...results];
        yielded = true;
    }
    if (!yielded) yield [];

    async function *map(promise: PromiseOrAsync<T>, index: number): AsyncIterable<KnownPromiseResult> {
        try {
            const isFunction = typeof promise === "function";
            const isObject = typeof promise === "object";
            const isFunctionOrObject = isFunction || isObject;
            if (isFunctionOrObject && "then" in promise) {
                return yield [index, { value: await promise, status: "fulfilled" }];
            }
            if (!isAsyncIterable(promise)) {
                if (isFunction) {
                    const value = promise();
                    return yield *map(value, index);
                }
                return yield [index, { reason: new Error("Unknown input"), status: "rejected" }];
            }
            for await (const value of promise) {
                yield [index, { value, status: "fulfilled" }];
            }
        } catch (reason) {
            yield [index, { reason, status: "rejected"}];
        }
    }
}