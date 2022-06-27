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
  (value: T): Promise<M> | M;
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

export interface SplitOptions<T>
  extends PushOptions,
    Partial<SplitProxyOptions> {
  name?(value: T): Name;
  assert?: SplitAssertFn<T>;
  is?: SplitIsFn<T>;
}

export type TypedBaseSplitOptions<T> =
  | {
      is: SplitIsFn<T>;
    }
  | {
      assert: SplitAssertFn<T>;
    };

export type TypedSplitOptions<T> = SplitOptions<T> & TypedBaseSplitOptions<T>;

export interface SplitAsyncIterable<T>
  extends Iterable<TheAsyncThing<T>>,
    AsyncIterable<T[]> {
  filter(fn: FilterFn<T>): AsyncIterable<T[]>;
  filter<Z extends T>(fn: FilterIsFn<T, Z>): AsyncIterable<Z[]>;
  filter<Z>(fn: FilterIsFn<unknown, Z>): AsyncIterable<Z[]>;
  find(fn: FilterFn<T>): TheAsyncThing<T>;
  find<Z extends T>(fn: FilterIsFn<T, Z>): TheAsyncThing<Z>;
  find<Z>(fn: FilterIsFn<unknown, Z>): TheAsyncThing<Z>;
  named(name: Name): AsyncIterable<T[]>;
  map<M>(fn: MapFn<T, M>): AsyncIterable<M[]>;
  take(count: number): AsyncIterable<T[]>;
  at(index: number): TheAsyncThing<T>;
  call(this: unknown, ...args: unknown[]): AsyncIterable<T[]>;
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
  map<M>(fn: MapFn<T, M>, options?: SplitOptions<M>): Split<M>;
  take(count: number): Split<T>;
  toArray(): TheAsyncThing<T[]>;
  named(name: Name): Split<T>;
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
