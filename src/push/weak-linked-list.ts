import { AbstractLinkedList } from "./abstract-linked-list";

export class WeakLinkedList<T> extends AbstractLinkedList<T> {
  constructor() {
    super(new WeakMap());
  }
  clear() {
    this.setMap(new WeakMap());
  }
}
