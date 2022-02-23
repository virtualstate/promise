import {allSettledGenerator} from "./all-settled";
import {anAsyncThing, TheAsyncThing} from "./the-thing";
import {isLike} from "./like";

export const PromiseAllRejectEarly = Symbol.for("@virtualstate/promise/all/rejectEarly");

export interface PromiseContext {
    [PromiseAllRejectEarly]?: unknown
}

export function all<T>(this: unknown, ...promises: PromiseArgs<T>): TheAsyncThing<T[]> {
    return anAsyncThing(allGenerator.call(this, ...promises));
}

export async function *allGenerator<T>(this: unknown, ...promises: PromiseArgs<T>): AsyncIterable<T[]> {
    let rejected;
    for await (const status of allSettledGenerator(...promises)) {
        rejected = status.filter(isPromiseRejectedResult);
        if (isLike<PromiseContext>(this) && this?.[PromiseAllRejectEarly] && rejected.length) {
            throw aggregateError(rejected);
        }
        if (rejected.length) continue; // Wait until we have accumulated all rejected
        yield status.map(status => status?.status === "fulfilled" ? status.value : undefined);
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
            const error = reasons.find((reason): reason is Error => reason instanceof Error);
            const message = error ? undefined : reasons.find((reason): reason is string => typeof reason === "string");
            return new AggregateError(reasons, error?.message ?? message);
        }
    }
}