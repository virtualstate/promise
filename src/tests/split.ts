import { split } from "../split";
import {ok} from "../like";
import {anAsyncThing} from "../the-thing";

{
    const [a, b, c] = split({
        async* [Symbol.asyncIterator]() {
            yield [1, 2, 3];
            yield [4, 5, 6];
        }
    });

    let total = 0;

    for await (const snapshot of a) {
        console.log(snapshot);
        ok(snapshot === 1 || snapshot === 4);
        total += 1;
    }
    for await (const snapshot of b) {
        console.log(snapshot);
        ok(snapshot === 2 || snapshot === 5);
        total += 1;
    }
    for await (const snapshot of c) {
        console.log(snapshot);
        ok(snapshot === 3 || snapshot === 6);
        total += 1;
    }
    // Cannot double read same iterable after complete
    for await (const snapshot of c) {
        ok(false, "should not get here");
    }

    console.log({ total });
    ok(total === 6);
}

{
    const read = split({
        async* [Symbol.asyncIterator]() {
            yield [1, 2, 3];
            yield [4, 5, 6];
        }
    });

    const five = await anAsyncThing(read.filter(value => value === 5));
    console.log({ five });
    ok(Array.isArray(five));
    ok(five[0] === 5);

}
{
    const read = split({
        async* [Symbol.asyncIterator]() {
            yield [1, 2, 3];
            yield [4, 5, 6];
        }
    });

    const even = await anAsyncThing(read.filter(value => value % 2 === 0));
    console.log({ even });
    ok(Array.isArray(even));
    ok(!even.includes(2)); // Only includes the final snapshot
    ok(even.includes(4));
    ok(even.includes(6));

    ok(!even.includes(1));
    ok(!even.includes(3));
    ok(!even.includes(5));

}

{
    const read = split({
        async* [Symbol.asyncIterator]() {
            yield [1, 2, 3];
            yield [4, 5, 6];
        }
    });

    for await (const even of read.filter(value => value % 2 === 0)) {
        console.log({ even });
        ok(Array.isArray(even));
        ok(
            even.includes(2) || (even.includes(4) && even.includes(6))
        );
        ok(!even.includes(1));
        ok(!even.includes(3));
        ok(!even.includes(5));
    }

}

{
    const read = split({
        async* [Symbol.asyncIterator]() {
            yield [1, 2, 3];
            yield [4, 5, 6];
        }
    });

    const [first] = read.filter(value => value % 2 === 0);

    for await (const even of first) {
        console.log({ even });
        ok(typeof even === "number");
        ok(
            even === 2 || even === 4
        );
    }

}
{
    const read = split({
        async* [Symbol.asyncIterator]() {
            yield [1, 2, 3];
            yield [4, 5, 6];
        }
    });

    const [,last] = read.filter(value => value % 2 === 0);

    for await (const even of last) {
        console.log({ even });
        ok(typeof even === "number");
        ok(
            even === 6
        );
    }

}

{
    const read = split({
        async* [Symbol.asyncIterator]() {
            yield [1, 2, 3];
            yield [4, 5, 6];
        }
    });

    const [first,last] = read.filter(value => value % 2 === 0);
    ok(await first === 4);
    ok(await last === 6);
}