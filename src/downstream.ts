/* c8 ignore start */

import { union } from "@virtualstate/union";
import { isAsyncIterable } from "./is";
import { isLike } from "./like";
import { anAsyncThing, TheAsyncThing } from "./the-thing";
import {Push} from "./push";

const IsKeySymbol = Symbol("IsKey");
type Key = { [IsKeySymbol]: true };
function isKey(value: unknown): value is Key {
  return isKeyLike(value) && value[IsKeySymbol] === true;

  function isKeyLike(value: unknown): value is Partial<Key> {
    return typeof value === "object" && IsKeySymbol in value;
  }
}

function createKey(): Key {
  return { [IsKeySymbol]: true };
}

type Keyed<T> = [Key, T];
type KeyedSnapshot<T> = Keyed<T>[];
type KeyedAsyncIterable<T> = AsyncIterable<Keyed<T>>;
type KeyedAsyncIterableInput<T> = [object, AsyncIterable<T>];

function isKeyedAsyncIterableInput<T>(
  input: unknown
): input is KeyedAsyncIterableInput<T> {
  if (!Array.isArray(input)) return false;
  if (input.length !== 2) return false;
  const [key, value] = input;
  return typeof key === "object" && isAsyncIterable(value);
}

export type DownstreamInput<T> = AsyncIterable<
  (T | AsyncIterable<T> | KeyedAsyncIterableInput<T>)[]
>;

/**
 * @experimental not part of the external api
 */
export function createDownstream<T>(
  input: DownstreamInput<T>
): TheAsyncThing<T[]> {
  return anAsyncThing(createDownstreamGenerator(input));
}

/**
 * @experimental not part of the external api
 */
export async function* createDownstreamGenerator<T>(
  input: DownstreamInput<T>
): AsyncIterable<T[]> {
  const pushIterables = new Push<KeyedAsyncIterable<T>>();

  const externalKeyMap = new WeakMap<object, Key>();
  const keyMap = new WeakMap<AsyncIterable<T>, Key>();
  const done = new WeakMap<Key, boolean>();
  let sourceDone = false;
  let last = undefined;
  // let latestKeys: Set<Key>;
  for await (const [snapshot, apply] of union<unknown>([
    source(),
    union(pushIterables),
  ])) {
    // console.log({ snapshot, apply });
    if (!isLike<(T | Key)[]>(snapshot)) continue;
    const values = new Map(
      isLike<KeyedSnapshot<T>>(apply) ? apply.filter(Array.isArray) : []
    );
    // latestKeys = new Set<Key>([...snapshot.filter(isKey)])
    const current = snapshot
      .map((value) => (isT(value) ? value : values.get(value)))
      .filter((value) => typeof value !== undefined);
    if (!isSame(last, current)) {
      last = undefined;
      yield current;
    }
    last = current;
  }

  function isSame(left?: unknown[], right?: unknown[]) {
    if (!left || !right) return false;
    if (left.length !== right.length) {
      return false;
    }
    if (!left.length) return true;
    return left.every((value, index) => value == right[index]);
  }

  function isT(value: T | Key): value is T {
    return !isKey(value);
  }

  async function* source(): AsyncIterable<(T | Key)[]> {
    let keys;
    for await (const snapshot of input) {
      const mapped = snapshot.map((value): T | Key => {
        if (isAsyncIterable<T>(value)) {
          const existingKey = keyMap.get(value);
          if (existingKey) return existingKey;
          const key = createKey();
          keyMap.set(value, key);
          pushIterables.push(keyed(key, value));
          return key;
        } else {
          if (isKeyedAsyncIterableInput(value)) {
            const [externalKey, iterable] = value;
            const existingKey = externalKeyMap.get(externalKey);
            if (existingKey) {
              return existingKey;
            }
            const key = createKey();
            externalKeyMap.set(externalKey, key);
            pushIterables.push(keyed(key, iterable));
            return key;
          } else {
            return value;
          }
        }
      });
      keys = mapped.filter(isKey);
      yield mapped;
    }
    pushIterables.close();
    sourceDone = true;
  }

  async function* keyed(
    key: Key,
    iterable: AsyncIterable<T>
  ): KeyedAsyncIterable<T> {
    let value;
    for await (value of iterable) {
      yield [key, value];
    }
    done.set(key, true);
  }
}