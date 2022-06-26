import { split } from "../split";
import { ok } from "../like";
import { anAsyncThing } from "../the-thing";

{
  const [a, b, c] = split(async function* () {
    yield [1, 2, 3];
    yield [4, 5, 6];
  });

  const results = [await a, await b, await c];
  console.log({ results });
  ok(results[0] === 4);
  ok(results[1] === 5);
  ok(results[2] === 6);
}
{
  const fn = split(async function* () {
    yield [1, 2, 3];
    yield [4, 5, 6];
  });
  const [a, b, c] = fn();

  const results = [await a, await b, await c];
  console.log({ results });
  ok(results[0] === 4);
  ok(results[1] === 5);
  ok(results[2] === 6);
}

async function* Times(times?: number) {
  console.log({ times, arguments });
  yield [1, 2, 3];
  if (times > 1) {
    yield [4, 5, 6];
  }
  if (times > 2) {
    yield [7, 8, 9];
  }
}

{
  const fn = split(Times);
  const [a, b, c] = fn(1);
  const results = [await a, await b, await c];
  console.log({ results });
  ok(results[0] === 1);
  ok(results[1] === 2);
  ok(results[2] === 3);
}

{
  const fn = split(Times);
  const [a, b, c] = fn(3);
  const results = [await a, await b, await c];
  console.log({ results });
  ok(results[0] === 7);
  ok(results[1] === 8);
  ok(results[2] === 9);
}

{
  const read = split(Times);

  const even = await anAsyncThing(read.filter((value) => value % 2 === 0));

  console.log({ even });
  ok(Array.isArray(even));
  ok(even.length === 1);
  ok(even[0] === 2);
}

{
  const read = split(Times);

  const even = await anAsyncThing(read().filter((value) => value % 2 === 0));

  console.log({ even });
  ok(Array.isArray(even));
  ok(even.length === 1);
  ok(even[0] === 2);
}

{
  const read = split(Times);

  const even = await anAsyncThing(read(2).filter((value) => value % 2 === 0));

  console.log({ even });
  ok(Array.isArray(even));
  ok(even.length === 2);
  ok(even[0] === 4);
  ok(even[1] === 6);
}

{
  const read = split(Times);

  const even = await anAsyncThing(read(3).filter((value) => value % 2 === 0));

  console.log({ even });
  ok(Array.isArray(even));
  ok(even.length === 1);
  ok(even[0] === 8);
}

{
  async function* sum(...all: number[]): AsyncIterable<number> {
    const value = all.reduce((sum, value) => sum + value, 0);
    console.log({ sum: all, value });
    yield value;
  }

  const one = split(sum)(1);

  const two = one(1);
  const five = two(3);
  const twenty = five(5, 5, 5);

  const [twentyResult] = twenty;
  const result = await twentyResult;

  console.log({ twenty, twentyResult, result });

  ok(result === 20);
}

{
  const [eights] = split(Times, {
    name(value) {
      console.log({ value });
      return value === 8 ? "eight" : "unknown";
    },
  })(3).named("eight");

  let total = 0;
  for await (const eight of eights) {
    console.log({ eight });
    total += 1;
    ok(eight === 8);
  }
  console.log({ total });
  ok(total === 1);
}
