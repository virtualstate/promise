import { split } from "../split";
import { ok } from "../like";
import { anAsyncThing } from "../the-thing";
import { union } from "@virtualstate/union";

{
  const [a, b, c] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
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
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  for await (const snapshot of read) {
    console.log({ snapshot });
    ok(Array.isArray(snapshot));
    ok(snapshot.length === 3);
    ok(
      (snapshot[0] === 1 && snapshot[1] === 2 && snapshot[2] === 3) ||
        (snapshot[0] === 4 && snapshot[1] === 5 && snapshot[2] === 6)
    );
  }
}

{
  const read = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  const result = await anAsyncThing(read);
  console.log({ result });
  ok(Array.isArray(result));
  ok(result[0] === 4);
  ok(result[1] === 5);
  ok(result[2] === 6);
}

{
  const read = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  const five = await anAsyncThing(read.filter((value) => value === 5));
  console.log({ five });
  ok(Array.isArray(five));
  ok(five[0] === 5);
}

{
  const read = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  const even = await anAsyncThing(read.filter((value) => value % 2 === 0));
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
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  for await (const even of read.filter((value) => value % 2 === 0)) {
    console.log({ even });
    ok(Array.isArray(even));
    ok(even.includes(2) || (even.includes(4) && even.includes(6)));
    ok(!even.includes(1));
    ok(!even.includes(3));
    ok(!even.includes(5));
  }
}

{
  const read = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  const [first] = read.filter((value) => value % 2 === 0);

  for await (const even of first) {
    console.log({ even });
    ok(typeof even === "number");
    ok(even === 2 || even === 4);
  }
}
{
  const read = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  const [, last] = read.filter((value) => value % 2 === 0);

  for await (const even of last) {
    console.log({ even });
    ok(typeof even === "number");
    ok(even === 6);
  }
}

{
  const read = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  const [first, last] = read.filter((value) => value % 2 === 0);
  ok((await first) === 4);
  ok((await last) === 6);
}
{
  const [first, middle, last] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  const joined = await anAsyncThing(union([first, middle, last]));

  console.log({ joined });

  ok(joined.length === 3);
  ok(joined[0] === 4);
  ok(joined[1] === 5);
  ok(joined[2] === 6);
}
{
  const [first, middle, last] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  const mixed = await anAsyncThing(union([middle, last, first]));

  console.log({ mixed });

  ok(mixed.length === 3);
  ok(mixed[0] === 5);
  ok(mixed[1] === 6);
  ok(mixed[2] === 4);
}

{
  const [first, middle, last] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  for await (const snapshot of union([middle, last, first])) {
    console.log({ snapshot });
    ok(Array.isArray(snapshot));
    ok(snapshot.length === 3);
    ok(
      (snapshot[0] === 2 && snapshot[1] === 3 && snapshot[2] === 1) ||
        (snapshot[0] === 5 && snapshot[1] === 6 && snapshot[2] === 4)
    );
  }
}

{
  const [first, , last] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  for await (const snapshot of union([last, first])) {
    console.log({ snapshot });
    ok(Array.isArray(snapshot));
    ok(snapshot.length === 2);
    ok(
      (snapshot[0] === 3 && snapshot[1] === 1) ||
        (snapshot[0] === 6 && snapshot[1] === 4)
    );
  }
}

{
  const [ones] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  }).named(1);

  let total = 0;
  for await (const one of ones) {
    console.log({ one });
    total += 1;
    ok(one === 1);
  }
  ok(total === 2);
}
{
  const [twos] = split(
    {
      async *[Symbol.asyncIterator]() {
        yield [1, 2, 3];
        yield [4, 5, 6];
        yield [1, 2, 3];
      },
    },
    {
      name(value) {
        return value === 2 ? "two" : "unknown";
      },
    }
  ).named("two");

  let total = 0;
  for await (const two of twos) {
    console.log({ two });
    total += 1;
    ok(two === 2);
  }
  ok(total === 2);
}
