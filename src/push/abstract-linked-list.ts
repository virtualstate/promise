import { ok } from "../like";

interface AbstractMap<T> {
  get(index: object): T | undefined;
  has(index: object): boolean;
  set(index: object, value: T): void;
}

export interface Node<T> {
  value: T;
  next?: object;
}

export interface LinkedList<T> {
  get(pointer: object): Node<T>;
  has(pointer: object): boolean;
  insert(after: object, pointer: object, value: T): void;
  clear(): void;
}

export abstract class AbstractLinkedList<T> implements LinkedList<T> {
  protected constructor(private _map?: AbstractMap<Node<T>>) {}

  protected set map(map: AbstractMap<Node<T>>) {
    this._map = map;
  }

  get(pointer: object): Node<T> | undefined {
    return this._map.get(pointer);
  }

  has(pointer: object): boolean {
    return this._map.has(pointer);
  }

  insert(after: object, pointer: object, value: T): void {
    if (!after) {
      this.clear();
    }
    const reference = after && this.get(after);
    ok(!after || reference, "Pointer does not belong in this list");
    const { _map: map } = this;
    map.set(pointer, {
      value,
      next: reference ? reference.next : undefined,
    });
    if (after) {
      map.set(after, {
        ...reference,
        next: pointer,
      });
    }
  }

  abstract clear(): void;
}
