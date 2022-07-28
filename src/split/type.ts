import { TheAsyncThing } from "../the-thing";
import { isLike, ok } from "../like";
import { PushOptions } from "../push";

export type Name = unknown;

export interface FilterFn<T> {
  (value: T, index: number, array: T[]): boolean;
}
export interface FilterIsFn<T, Z extends T> {
  (value: T, index: number, array: T[]): value is Z;
}

export interface MapFn<T, M> {
  (value: T, index: number, array: T[]): Promise<M> | M;
}

export type AsyncMapEntry<K, A extends AsyncIterable<unknown[]>> = [K, A];

export interface AsyncMap<K, V extends AsyncIterable<unknown[]>> {
  get(key: K): V;
  set(key: K, value: V): never;
  delete(key: K): never;
  has(key: K): TheAsyncThing<boolean>;
  size: never;
}

export type SplitInputAsyncIterable<T> = AsyncIterable<T | T[]>;

export interface SplitInputFn<T> {
  (...args: unknown[]): SplitInputAsyncIterable<T>;
}

export type SplitInput<T> = SplitInputAsyncIterable<T> | SplitInputFn<T>;

export interface SplitProxyOptions {
  proxy: true;
}

export interface SplitAssertFn<T> {
  (value: unknown): asserts value is T;
}
export interface SplitIsFn<T> {
  (value: unknown): value is T;
}

export interface SplitOptions extends PushOptions, Partial<SplitProxyOptions> {
  empty?: boolean;
}

export type TypedBaseSplitOptions<T> =
  | {
      is: SplitIsFn<T>;
    }
  | {
      assert: SplitAssertFn<T>;
    };

export type TypedSplitOptions<T> = SplitOptions & TypedBaseSplitOptions<T>;

export type SplitConcatSyncInput<T> = T | T[] | Iterable<T>;
export type SplitConcatInput<T> =
  | AsyncIterable<SplitConcatSyncInput<T>>
  | SplitConcatSyncInput<T>;

export interface SplitAsyncIterable<T>
  extends Iterable<TheAsyncThing<T>>,
    AsyncIterable<T[]> {
  filter(fn: FilterFn<T>): AsyncIterable<T[]>;
  filter<Z extends T>(fn: FilterIsFn<T, Z>): AsyncIterable<Z[]>;
  filter<Z>(fn: FilterIsFn<unknown, Z>): AsyncIterable<Z[]>;
  find(fn: FilterFn<T>): TheAsyncThing<T>;
  find<Z extends T>(fn: FilterIsFn<T, Z>): TheAsyncThing<Z>;
  find<Z>(fn: FilterIsFn<unknown, Z>): TheAsyncThing<Z>;
  findIndex(fn: FilterFn<T>): TheAsyncThing<number>;
  copyWithin(target: number, start?: number, end?: number): AsyncIterable<T[]>;
  map<M>(fn: MapFn<T, M>): AsyncIterable<M[]>;
  take(count: number): AsyncIterable<T[]>;
  entries(): AsyncIterable<[number, T][]>;
  flatMap<M>(fn: MapFn<T, M[] | M>): AsyncIterable<M[]>;
  at(index: number): TheAsyncThing<T>;
  includes(search: T, fromIndex?: number): TheAsyncThing<boolean>;
  every(fn: FilterFn<T>): TheAsyncThing<boolean>;
  reverse(): AsyncIterable<T[]>;
  concat(...args: SplitConcatSyncInput<T>[]): AsyncIterable<T[]>;
  concat(other: SplitConcatInput<T>): AsyncIterable<T[]>;
  mask(mask: AsyncIterable<unknown>): AsyncIterable<T[]>;
  push(other: SplitInput<T>): AsyncIterable<T[]>;
  push<M>(other: SplitInput<M>): AsyncIterable<(M | T)[]>;
  call(this: unknown, ...args: unknown[]): AsyncIterable<T[]>;
  group<K extends string | number | symbol>(
    fn: MapFn<T, K>
  ): Record<K, AsyncIterable<T[]>>;
  groupToMap<K extends string | number | symbol>(
    fn: MapFn<T, K>
  ): AsyncMap<K, AsyncIterable<T[]>>;
  bind(
    this: unknown,
    ...args: unknown[]
  ): (...args: unknown[]) => AsyncIterable<T[]>;
}

export interface Split<T> extends SplitAsyncIterable<T>, Promise<T[]> {
  filter(fn: FilterFn<T>): Split<T>;
  filter<Z extends T>(fn: FilterIsFn<T, Z>): Split<Z>;
  filter<Z>(fn: FilterIsFn<unknown, Z>): Split<Z>;
  at(index: number): TheAsyncThing<T>;
  map<M>(
    fn: MapFn<T, M>,
    options?: TypedSplitOptions<M> | SplitOptions
  ): Split<M>;
  take(count: number): Split<T>;
  concat(...args: T[]): Split<T>;
  concat(other: SplitConcatInput<T>): Split<T>;
  mask(mask: AsyncIterable<unknown>): Split<T>;
  copyWithin(target: number, start?: number, end?: number): Split<T>;
  entries(): Split<[number, T]>;
  flatMap<M>(
    fn: MapFn<T, M[] | M>,
    options?: TypedSplitOptions<M> | SplitOptions
  ): Split<M>;
  group<K extends string | number | symbol>(
    fn: MapFn<T, K>
  ): Record<K, Split<T>>;
  groupToMap<K extends string | number | symbol>(
    fn: MapFn<T, K>
  ): AsyncMap<K, Split<T>>;
  reverse(): Split<T>;
  push(
    other: SplitInput<T>,
    otherOptions?: TypedSplitOptions<T> | SplitOptions
  ): Split<T>;
  push<M>(
    other: SplitInput<M>,
    otherOptions?: TypedSplitOptions<M> | SplitOptions
  ): Split<M | T>;
  call(this: unknown, ...args: unknown[]): Split<T>;
  bind(this: unknown, ...args: unknown[]): SplitFn<T>;
}

export function assertSplitInputFn<T>(
  input: unknown
): asserts input is SplitInputFn<T> {
  ok(typeof input === "function");
}

export interface SplitFn<T> extends Split<T> {
  (this: unknown, ...args: unknown[]): SplitFn<T>;
  call(this: unknown, ...args: unknown[]): SplitFn<T>;
  bind(this: unknown, ...args: unknown[]): SplitFn<T>;
}

export function isSplitAt<T, S extends Split<T> = Split<T>>(
  value: unknown
): value is Pick<S, "at"> {
  return isLike<Split<T>>(value) && typeof value.at === "function";
}
