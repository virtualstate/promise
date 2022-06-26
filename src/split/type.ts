import { TheAsyncThing } from "../the-thing";
import { ok } from "../like";

export type Name = unknown;

export interface FilterFn<T> {
  (value: T, index: number, array: T[]): boolean;
}
export interface FilterIsFn<T, Z extends T> {
  (value: T, index: number, array: T[]): value is Z;
}

export type SplitInputAsyncIterable<T> = AsyncIterable<T | T[]>;

export interface SplitInputFn<T> {
  (...args: unknown[]): SplitInputAsyncIterable<T>;
}

export type SplitInput<T> = SplitInputAsyncIterable<T> | SplitInputFn<T>;

export interface Split<T>
  extends Iterable<TheAsyncThing<T>>,
    AsyncIterable<T[]>,
    Promise<T[]> {
  filter(value: FilterFn<T>): Split<T>;
  filter<Z extends T>(value: FilterIsFn<T, Z>): Split<Z>;
  filter<Z>(value: FilterIsFn<unknown, Z>): Split<Z>;
  at(index: number): TheAsyncThing<T>;
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
