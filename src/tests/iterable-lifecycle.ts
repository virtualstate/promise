import {
    asyncIterableLifecycle,
    IterableLifecycle,
    iterableLifecycle,
    IterableLifecycleIterator
} from "../iterable-lifecycle";
import {ok} from "../like";

export default 1;

export type LifecycleEvent =
  | {
      type: "next";
      args: unknown[];
    }
  | {
      type: "next-return";
      args: unknown[];
    }
    | {
    type: "return";
    args: unknown[];
}
    | {
    type: "return-return";
    args: unknown[];
}
  | {
      type: "throw";
      args: unknown[];
    };

export function events<T>(fn?: (event: LifecycleEvent) => void): IterableLifecycle<T> & { events: LifecycleEvent[] } {
    const events: LifecycleEvent[] = [];
    function push(event: LifecycleEvent) {
        events.push(event);
        fn?.(event);
    }
    return {
        events,
        next: {
            next(...args) {
                push({
                    type: "next",
                    args
                });
                return undefined;
            },
            return(...args) {
                push({
                    type: "next-return",
                    args
                });
                return undefined;
            },
        },
        return: {
            next(...args) {
                push({
                    type: "return",
                    args
                });
                return undefined;
            },
            return(...args) {
                push({
                    type: "return-return",
                    args
                });
                return undefined;
            },
        },
        throw(...args) {
            push({
                type: "throw",
                args
            });
            return undefined;
        },
    }
}

{
  const lifecycle = events<number>();
  const source = [1, 2, 3, 4, 5];
  const result = [
    ...iterableLifecycle(source, lifecycle),
  ];
    console.log(source);
    console.log(result);
    console.log(lifecycle.events);

    ok(result.length === source.length);
    ok(lifecycle.events.length === ((source.length * 2) + 2 + 2));

    for (const [index, value] of source.entries()) {
        ok(result[index] === value);
    }
}

{
    const lifecycle = events<number>();
    const source = [1, 2, 3];
    const iterator: Iterator<number, unknown, unknown> = iterableLifecycle(source, lifecycle)[Symbol.iterator]();

    iterator.next(5);
    iterator.next(6);
    iterator.next(7);
    // This is the final next, it will trigger the return as we have reached the
    // end of our source
    iterator.next(8);
    // This is beyond what will be seen
    iterator.next(9);
    iterator.return(10);

    console.log(lifecycle.events);

    ok(lifecycle.events.length === ((source.length * 2) + 2 + 2))
}
{
    const lifecycle = events<number>();
    const source = [1, 2, 3];
    const iterator: Iterator<number, unknown, unknown> = iterableLifecycle(source, lifecycle)[Symbol.iterator]();

    iterator.next(5);
    iterator.next(6);
    iterator.next(7);
    // The passed value here will not be seen
    iterator.return(8);

    console.log(lifecycle.events);
}

{
    const lifecycle = events<number>();
    const source = {
        async *[Symbol.asyncIterator]() {
            yield 1;
            yield 2;
            yield 3;
        }
    };
    const iterator: AsyncIterator<number, unknown, unknown> = asyncIterableLifecycle(source, lifecycle)[Symbol.asyncIterator]();

    await iterator.next(5);
    await iterator.next(6);
    await iterator.next(7);
    // This is the final next, it will trigger the return as we have reached the
    // end of our source
    await iterator.next(8);
    // This is beyond what will be seen
    await iterator.next(9);
    await iterator.return(10);

    console.log(lifecycle.events);
    ok(lifecycle.events.length === 10)
}