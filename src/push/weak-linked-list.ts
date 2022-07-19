import { AbstractLinkedList } from "./abstract-linked-list";

export class WeakLinkedList<T> extends AbstractLinkedList<T> {
  constructor() {
    super();
  }
  clear() {
    this.map = new WeakMap();
  }
}
