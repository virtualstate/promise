import {all, allSettled} from "../";
import {ok} from "../like";
import {sleep} from "./sleep";

{
    const [a, b] = await all(Promise.resolve(1 as const), Promise.resolve(2 as const));

    console.log({ a, b });

    ok(a === 1);
    ok(b === 2);
}

{
    const [a, b] = await all([
        Promise.resolve(1 as const),
        Promise.resolve(2 as const)
    ]);

    console.log({ a, b });

    ok(a === 1);
    ok(b === 2);
}

{

    for await(const [a, b] of all(sleep(10, 1 as const), sleep(15, 2 as const))) {
        console.log({ state: { a, b } });
        if (a) ok(a === 1);
        if (b) ok(b === 2);
    }

}

{
    const [a, b, c] = await all(async function *() {
            yield 1 as const;
            yield 2 as const;
        },
        (async function *() {
            yield 3 as const;
            yield 4 as const;
        })(),
        async function() {
            await sleep(10);
            return 8 as const;
        });

    console.log({ a, b, c });

    ok(a === 2);
    ok(b === 4);
    ok(c === 8);
}

{

    for await(const [a, b, c] of all(
        async function *() {
            yield 1 as const;
            yield 2 as const;
        },
        (async function *() {
            yield 3 as const;
            yield 4 as const;
        })(),
        async function() {
            await sleep(10);
            return 8 as const;
        }
    )) {
        console.log({ state: { a, b, c } });
        if (a) ok(([1, 2] as const).includes(a));
        if (b) ok(([3, 4] as const).includes(b));
        if (c) ok(([8] as const).includes(c));
    }

}

{
    const [a, b] = await allSettled(Promise.resolve(1 as const), Promise.resolve(2 as const));

    console.log({ a, b });

    ok(a.status === "fulfilled" && a.value === 1);
    ok(b.status === "fulfilled" && b.value === 2);
}


{

    for await(const [a, b] of allSettled(sleep(10, 1 as const), sleep(15, 2 as const))) {
        console.log({ state: { a, b } });
        if (a) ok(a.status === "fulfilled" && a.value === 1);
        if (b) ok(b.status === "fulfilled" && b.value === 2);
    }

}

{
    for await (const [a, b, c, d] of allSettled(
        async function *() {
            yield 1 as const;
            yield 2 as const;
        },
        (async function *() {
            yield 3 as const;
            yield 4 as const;
        })(),
        (async function *() {
            yield 5 as const;
            yield 6 as const;
            await sleep(5);
            throw await Promise.reject(7);
        })(),
        async function() {
            await sleep(10);
            return 8 as const;
        }
    )) {
        console.log({ state: { a, b, c, d } });
        if (a) ok(a.status === "fulfilled" && ([1, 2] as const).includes(a.value));
        if (b) ok(b.status === "fulfilled" && ([3, 4] as const).includes(b.value));
        if (c) ok(c.status === "fulfilled" ? ([5, 6] as const).includes(c.value) : c.reason === 7);
        if (d) ok(d.status === "fulfilled" && ([8] as const).includes(d.value));
    }
}