type PromiseOrAsync<T> = Promise<T> | AsyncIterable<T> | PromiseFn<T>;
type PromiseFn<T> = () => PromiseOrAsync<T>;
type PromiseArg<T> = PromiseOrAsync<T> | PromiseOrAsync<T>[];
type PromiseArgs<T> = PromiseArg<T>[];

/* by defining that we must have at least one arg, we are defining that we have a defined length too */
type PromiseArgTuple<T> = [PromiseOrAsync<T>, ...PromiseOrAsync<T>[]];

type PromiseTuple<TArgs extends PromiseArgTuple<unknown>> = {
    [K in keyof TArgs]: TArgs[K] extends PromiseOrAsync<infer R> ? R : never
} & { length: TArgs["length"] }

type PromiseSettledTuple<TArgs extends PromiseArgTuple<unknown>> = {
    [K in keyof TArgs]: TArgs[K] extends PromiseOrAsync<infer R> ? PromiseSettledResult<R> : never
} & { length: TArgs["length"] }