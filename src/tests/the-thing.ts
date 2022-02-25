import { anAsyncThing } from "../the-thing";
import {ok} from "../like";

{

    const input = Math.random();
    const result = await anAsyncThing(Promise.resolve(input));
    ok(input === result);

}
{

    const input = Math.random();
    let finallySet = false;
    const result = await anAsyncThing(Promise.resolve(input)).finally(() => {
        finallySet = true;
    })
    ok(input === result);
    ok(finallySet);

}

{
    const input1 = Math.random();
    const input2 = Math.random();

    const result = await anAsyncThing((async function *() {
        yield input1;
        yield input2;
    })());

    ok(result === input2);

}


{
    const input = Math.random();

    let results = [];
    for await (const result of anAsyncThing(Promise.resolve(input))) {
        ok([input].includes(result));
        results.push(result);
    }
    ok(results.length === 1);
    ok(results[0] === input);
}

{
    const input1 = Math.random();
    const input2 = Math.random();

    let results = [];
    for await (const result of anAsyncThing((async function *() {
        yield input1;
        yield input2;
    })())) {
        ok([input1, input2].includes(result));
        results.push(result);
    }
    ok(results.length === 2);
    ok(results[0] === input1);
    ok(results[1] === input2);
}
{
    const input1 = Math.random();
    const input2 = Math.random();

    const iterator = (async function *() {
        yield input1;
        yield input2;
    }())[Symbol.asyncIterator]();

    let results = [];
    for await (const result of anAsyncThing({
        next() {
            return iterator.next()
        }
    })) {
        ok([input1, input2].includes(result));
        results.push(result);
    }
    console.log(results);
    ok(results.length === 2);
    ok(results[0] === input1);
    ok(results[1] === input2);
}


{

    const input = Math.random();
    const iterator = anAsyncThing(Promise.resolve(input));
    ok(input === (await iterator.next()).value);
    await iterator.return();

}
{

    const input = Math.random();
    const iterator = anAsyncThing(Promise.resolve(input));
    ok(input === (await iterator.next()).value);
    const caught = await iterator.throw(1).catch(caught => caught);
    ok(caught);

}

{
    const input = Math.random();
    const iterator = anAsyncThing(Promise.resolve(input));
    await iterator.return();

}

{
    const input = Math.random();
    const iterator = anAsyncThing(Promise.resolve(input));
    await iterator.throw();

}

{
    const input = Math.random();
    const iterator = anAsyncThing(Promise.resolve(input));
    ok(typeof iterator[Symbol.toStringTag] === "string");

}