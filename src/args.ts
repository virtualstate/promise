export type PromiseOrAsync<T> = Promise<T> | AsyncIterable<T> | PromiseFn<T>;
export type PromiseFn<T> = () => PromiseOrAsync<T>;
export type PromiseArg<T> = PromiseOrAsync<T> | PromiseOrAsync<T>[];
export type PromiseArgs<T> = PromiseArg<T>[];

/* by defining that we must have at least one arg, we are defining that we have a defined length too */
export type SinglePromiseArgTuple<T> = [PromiseOrAsync<T>, ...PromiseOrAsync<T>[]] | Readonly<[PromiseOrAsync<T>, ...PromiseOrAsync<T>[]]>;
export type PromiseArgTuple<T> = [SinglePromiseArgTuple<T>] | SinglePromiseArgTuple<T>;

export type SinglePromiseTuple<TArgs extends PromiseArgTuple<unknown> = PromiseArgTuple<unknown>> = {
    [K in keyof TArgs]: K extends (`${number}` | number) ? TArgs[K] extends PromiseOrAsync<infer R> ? R : never : TArgs[K]
} & { length: TArgs["length"] }
export type PromiseTuple<TArgs extends PromiseArgTuple<unknown>> = TArgs[0] extends SinglePromiseArgTuple<unknown> ? SinglePromiseTuple<TArgs[0]> : SinglePromiseTuple<TArgs>
export type PromiseTupleIntermediateArray<RA extends Record<number, unknown> & { length: number }> = {
    [K in keyof RA]: K extends (`${number}` | number) ? RA[K] | undefined : RA[K]
} & { length: RA["length"] };
export type PromiseTupleIntermediate<TArgs extends PromiseArgTuple<unknown>> = PromiseTupleIntermediateArray<PromiseTuple<TArgs>>

export type PromiseSettledTuple<TArgs extends PromiseArgTuple<unknown>> = {
    [K in keyof TArgs]: TArgs[K] extends PromiseOrAsync<infer R> ? PromiseSettledResult<R> : never
} & { length: TArgs["length"] }
export type PromiseSettledTupleIntermediate<TArgs extends PromiseArgTuple<unknown>> = PromiseTupleIntermediateArray<PromiseSettledTuple<TArgs>>