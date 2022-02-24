type PromiseArg<T> = Promise<T> | Promise<T>[];
type PromiseArgs<T> = PromiseArg<T>[];

/* by defining that we must have at least one arg, we are defining that we have a defined length too */
type PromiseArgTuple<T> = [Promise<T>, ...Promise<T>[]];

type PromiseTuple<TArgs extends PromiseArgTuple<unknown>> = {
    [K in keyof TArgs]: TArgs[K] extends Promise<infer R> ? R : never
} & { length: TArgs["length"] }

type PromiseSettledTuple<TArgs extends PromiseArgTuple<unknown>> = {
    [K in keyof TArgs]: TArgs[K] extends Promise<infer R> ? PromiseSettledResult<R> : never
} & { length: TArgs["length"] }