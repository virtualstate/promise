import {ok} from "../like";


interface AbstractMap<T> {
    get(index: object): T | undefined;
    set(index: object, value: T): void;
}

export interface Node<T> {
    value: T;
    next?: object;
}

export interface LinkedList<T> {
    get(pointer: object): Node<T>;
    insert(after: object, pointer: object, value: T): void;
    clear(): void;
}

export abstract class AbstractLinkedList<T> implements LinkedList<T> {

    protected constructor(private map: AbstractMap<Node<T>>) {

    }

    protected setMap(map: AbstractMap<Node<T>>) {
        this.map = map;
    }

    get(pointer: object): Node<T> | undefined {
        return this.map.get(pointer);
    }

    insert(after: object, pointer: object, value: T): void {
        if (!after) {
            this.clear();
        }
        const reference = after && this.get(after);
        ok(!after || reference, "Pointer does not belong in this list")
        this.map.set(pointer, {
            value,
            next: reference ? reference.next : undefined
        });
        if (after) {
            this.map.set(after, {
                ...reference,
                next: pointer
            });
        }
    }

    abstract clear(): void;

}
