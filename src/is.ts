

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
    function isAsyncIterableInstance(value: unknown): value is AsyncIterable<T> {
        return !!value;
    }
    return !!(
        isAsyncIterableInstance(value) &&
        typeof value[Symbol.asyncIterator] === "function"
    );
}
