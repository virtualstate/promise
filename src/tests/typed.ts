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

    for await(const [a, b] of all(sleep(10, 1 as const), sleep(15, 2 as const))) {
        console.log({ state: { a, b } });
        if (a) ok(a === 1);
        if (b) ok(b === 2);
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