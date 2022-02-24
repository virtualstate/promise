import {allSettledGenerator} from "./all-settled";
import {anAsyncThing, TheAsyncThing} from "./the-thing";
import {isLike} from "./like";

export const PromiseAllRejectEarly = Symbol.for("@virtualstate/promise/all/rejectEarly");

export interface PromiseContext {
    [PromiseAllRejectEarly]?: unknown
}

export function all<T, TArgs extends  PromiseArgTuple<T>>(this: unknown, ...promises: TArgs): TheAsyncThing<PromiseTuple<TArgs>>
export function all<T>(this: unknown, ...promises: PromiseArgs<T>): TheAsyncThing<T[]>
export function all<T>(this: unknown, ...promises: PromiseArgs<T>): TheAsyncThing {
    return anAsyncThing(allGenerator.call(this, ...promises));
}

export function allGenerator<T, TArgs extends  PromiseArgTuple<T>>(this: unknown, ...promises: TArgs): AsyncIterable<PromiseTuple<TArgs>>
export function allGenerator<T>(this: unknown, ...promises: PromiseArgs<T>): AsyncIterable<T[]>
export async function *allGenerator<T>(this: unknown, ...promises: PromiseArgs<T>): AsyncIterable<unknown> {
    let rejected;
    for await (const status of allSettledGenerator(...promises)) {
        rejected = status.filter(isPromiseRejectedResult);
        if (isLike<PromiseContext>(this) && this?.[PromiseAllRejectEarly] && rejected.length) {
            throw aggregateError(rejected);
        }
        if (rejected.length) continue; // Wait until we have accumulated all rejected
        yield status.map((status): T => status?.status === "fulfilled" ? status.value : undefined);
    }
    if (rejected?.length) {
        throw aggregateError(rejected);
    }

    function isPromiseRejectedResult(status: PromiseSettledResult<unknown>): status is PromiseRejectedResult {
        return status?.status === "rejected";
    }

    function aggregateError(rejected: PromiseRejectedResult[]) {
        if (rejected.length === 1) {
            return rejected[0].reason;
        } else {
            const reasons = rejected.map(({ reason }) => reason);
            return new AggregateError(reasons);
        }
    }
}