import { blend } from "../blend";
import {all} from "../all";
import {ok} from "../like";
import {Push} from "../push";
import {union} from "@virtualstate/union";

{
    const blender = blend({ random: true });

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
    const blender = blend({ random: true });

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

{
    const blender = blend({ close: true });

    const source = new Push();
    source.push(1);
    source.push(2);
    source.close();

    const sourceIndex = blender.source(source);

    const target = new Push();
    const targetIndex = blender.target(target);

    const [{ promise }] = blender.connect({
        blended: [
            {
                source: sourceIndex,
                target: targetIndex
            }
        ]
    });

    // Target will now be loaded
    await promise;

    const results = [];

    for await (const snapshot of target) {
        results.push(snapshot);
    }

    console.log(results);

    ok(results.length === 2);
    ok(results[0] === 1);
    ok(results[1] === 2);

}

{
    const blender = blend({ close: true });

    const source = new Push();
    source.push(1);
    source.push(2);
    source.close();

    const sourceIndex = blender.source(source);

    const targetA = new Push();
    const targetAIndex = blender.target(targetA);
    const targetB = new Push();
    const targetBIndex = blender.target(targetB);

    const [{ promise }] = blender.connect({
        blended: [
            {
                source: sourceIndex,
                target: targetAIndex
            },
            {
                source: sourceIndex,
                target: targetBIndex
            }
        ]
    });

    // Target will now be loaded
    await promise;

    const results = [];

    for await (const snapshot of union([
        targetA,
        targetB
    ])) {
        results.push(snapshot);
    }

    console.log(results);

    ok(results.length === 2);
    ok(results[0][0] === 1);
    ok(results[0][1] === 1);
    ok(results[1][0] === 2);
    ok(results[1][1] === 2);

}

{
    const blender = blend({ close: true });

    const sourceA = new Push();
    sourceA.push(1);
    sourceA.push(2);
    sourceA.close();
    const sourceAIndex = blender.source(sourceA);

    const sourceB = new Push();
    sourceB.push(3);
    sourceB.push(4);
    sourceB.close();
    const sourceBIndex = blender.source(sourceB);

    const target = new Push();
    const targetIndex = blender.target(target);

    const [{ promise }] = blender.connect({
        blended: [
            {
                source: sourceAIndex,
                target: targetIndex
            },
            {
                source: sourceBIndex,
                target: targetIndex
            }
        ]
    });

    // Target will now be loaded
    await promise;

    const results = [];

    for await (const snapshot of target) {
        results.push(snapshot);
    }

    console.log(results);
    ok(results.length === 4);
    ok(results.includes(1));
    ok(results.includes(2));
    ok(results.includes(3));
    ok(results.includes(4));

}