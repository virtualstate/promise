import { blend } from "../blend";
import {all} from "../all";
import {ok} from "../like";

{
    const blender = blend();

    blender.source({
        async * [Symbol.asyncIterator]() {
            yield 1;
            yield 1;
            yield 1;
            yield 1;
        }
    });
    blender.source({
        async * [Symbol.asyncIterator]() {
            yield 2;
            yield 3;
            yield 4;
            yield 5;
        }
    });
    blender.source({
        async * [Symbol.asyncIterator]() {
            yield 9;
            yield 6;
            yield 3;
            yield 1;
        }
    });
    blender.target(console.log);
    blender.target(console.log);
    blender.target(console.log);

    const blended = blender.connect();

    console.log({ blended });

    await all(...blended.map(({ promise }) => promise));

}

{
    const blender = blend();

    const expectedInitial = Symbol("Expected initial symbol");
    const unexpected = Symbol("Unexpected symbol");

    const replace = blender.source({
        async * [Symbol.asyncIterator]() {
            yield expectedInitial;
            await new Promise(resolve => setTimeout(resolve, 200));
            yield unexpected;
            yield unexpected;
            yield unexpected;
            yield unexpected;
        }
    });

    const expectedSecond = Symbol("Expected second symbol");
    const expectedThird = Symbol("Expected third symbol");
    const expectedFourth = Symbol("Expected fourth symbol");

    blender.source({
        async * [Symbol.asyncIterator]() {
            yield expectedSecond;
            await new Promise(resolve => setTimeout(resolve, 200));
            yield expectedThird;
            yield expectedFourth;
        }
    });

    const results: unknown[] = [];

    blender.target(value => results.push(value));
    blender.target(value => results.push(value));

    const blended = blender.connect();

    console.log({ blended });

    const expected = Symbol("Expected Symbol");

    await all([
        all(blended.map(({ promise }) => promise)),
        async () => {
            await new Promise(resolve => setTimeout(resolve, 5));
            blender.source({
                async * [Symbol.asyncIterator]() {
                    yield expected;
                }
            }, replace);
        }
    ]);

    console.log({ results });

    ok(results.includes(expectedInitial));
    ok(results.includes(expected));
    ok(results.includes(expectedSecond));
    ok(results.includes(expectedThird));
    ok(results.includes(expectedFourth));
    ok(!results.includes(unexpected));

}