import {Line} from "../line";
import {ok} from "../like";

{

    const line = new Line();

    line.push(1);
    line.push(2);
    line.push(3);

    line.close();

    const iterator = line[Symbol.asyncIterator]();

    ok((await iterator.next()).value === 1);
    ok((await iterator.next()).value === 2);
    ok((await iterator.next()).value === 3);
    ok((await iterator.previous()).value === 2);
    ok((await iterator.next()).value === 3);
    ok((await iterator.previous()).value === 2);
    ok((await iterator.previous()).value === 1);
    ok((await iterator.previous()).done);

    // 1, 2, 3
    for await (const value of iterator) {
        console.log({ value });
    }

    ok((await iterator.next()).done);
    ok((await iterator.previous()).value === 3);
    ok((await iterator.previous()).value === 2);
    ok((await iterator.previous()).value === 1);

    // 2, 3
    for await (const value of iterator) {
        console.log({ value });
    }

    async function start() {
        let result;

        do {
            result = await iterator.previous();
        } while (!result.done);
    }

    await start();

    ok((await iterator.next()).value === 1);
    ok((await iterator.next()).value === 2);
    ok((await iterator.next()).value === 3);
    ok((await iterator.next()).done);

    ok((await iterator.previous()).value === 3);
    ok((await iterator.previous()).value === 2);
    ok((await iterator.next()).value === 3);
    ok((await iterator.previous()).value === 2);
    ok((await iterator.next()).value === 3);
}

{

    const line = new Line();

    line.push(1);
    line.push(2);
    line.push(3);

    const iterator = line[Symbol.asyncIterator]();

    ok((await iterator.next()).value === 1);
    ok((await iterator.next()).value === 2);
    ok((await iterator.next()).value === 3);

    let promise = iterator.next();

    let expected = 4 + Math.random();
    line.push(expected);

    ok((await promise).value === expected);

    ok((await iterator.previous()).value === 3);
    ok((await iterator.previous()).value === 2);
    ok((await iterator.previous()).value === 1);
    ok((await iterator.previous()).done);

    line.push(expected + 1);
    line.close();

    ok((await iterator.next()).value === 1);
    ok((await iterator.next()).value === 2);
    ok((await iterator.next()).value === 3);
    ok((await iterator.next()).value === expected);
    ok((await iterator.next()).value === expected + 1);
    ok((await iterator.next()).done);

    let reversed = Line.reverse(line);

    for await (const value of reversed) {
        console.log({ value });
    }

    reversed = Line.reverse(line);

    ok((await reversed.next()).value === expected + 1);
    ok((await reversed.next()).value === expected);
    ok((await reversed.next()).value === 3);
    ok((await reversed.next()).value === 2);
    ok((await reversed.next()).value === 1);
    ok((await reversed.next()).done);





}
