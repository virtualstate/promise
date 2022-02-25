import {isLike} from "./like";

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
    return !!(
        isLike<AsyncIterable<unknown>>(value) &&
        typeof value[Symbol.asyncIterator] === "function"
    );
}
