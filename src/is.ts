import {isLike} from "./like";

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
    return !!(
        isLike<AsyncIterable<unknown>>(value) &&
        typeof value[Symbol.asyncIterator] === "function"
    );
}

export function isIterable<T>(value: unknown): value is Iterable<T> {
    return !!(
        isLike<Iterable<unknown>>(value) &&
        typeof value[Symbol.iterator] === "function"
    );
}

export function isIteratorYieldResult<T>(value: unknown): value is IteratorYieldResult<T> {
    return !!(
        isLike<Partial<IteratorResult<T>>>(value) &&
        typeof value.done === "boolean" &&
        !value.done
    );
}

export function isIteratorNext<T>(value: unknown): value is { next(value: unknown): IteratorResult<T> } {
    return !!(
        isLike<Partial<Iterator<unknown>>>(value) &&
        typeof value.next === "function"
    );
}

export function isIteratorReturn<T>(value: unknown): value is { return(value: unknown): IteratorResult<T> } {
    return !!(
        isLike<Partial<Iterator<unknown>>>(value) &&
        typeof value.return === "function"
    );
}