import { split } from "../split";
import {ok} from "../like";

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