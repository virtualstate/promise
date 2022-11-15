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
        console.log(value);
    }

    ok((await iterator.next()).done);
    ok((await iterator.previous()).value === 3);
    ok((await iterator.previous()).value === 2);
    ok((await iterator.previous()).value === 1);

    // 2, 3
    for await (const value of iterator) {
        console.log(value);
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