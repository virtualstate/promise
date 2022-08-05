import { split } from "../split";
import { ok } from "../like";
import { union } from "@virtualstate/union";
import {isArray, isAsyncIterable} from "../is";

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
    console.log({ snapshot });
    ok(false, "should not get here");
    total += 1;
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

  const result = await read;
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

  const five = await read.filter((value) => value === 5);
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

  const even = await read.filter((value) => value % 2 === 0);
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

  const first = read.filter((value) => value % 2 === 0).at(0);

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
  const [, last] = await split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  }).filter((value) => value % 2 === 0);
  console.log({ last });
  ok(typeof last === "number");
  ok(last === 6);
}
{
  const last = await split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  })
    .filter((value) => value % 2 === 0)
    .at(1);
  console.log({ last });
  ok(typeof last === "number");
  ok(last === 6);
}

{
  const [a, b, c] = await split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });
  console.log({ a, b, c });
  ok(a === 4);
  ok(b === 5);
  ok(c === 6);
}

{
  const [a, b, c] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });
  console.log({ a, b, c });
  ok((await a) === 4);
  ok((await b) === 5);
  ok((await c) === 6);
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

  const [a, b, c] = split(union([first, middle, last]));

  ok((await a) === 4);
  ok((await b) === 5);
  ok((await c) === 6);
}
{
  const [first, middle, last] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  });

  const [a, b, c] = split(union([middle, last, first]));

  ok((await a) === 5);
  ok((await b) === 6);
  ok((await c) === 4);
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
  }).filter((value) => value === 1);

  let total = 0;
  for await (const one of ones) {
    console.log({ one });
    total += 1;
    ok(one === 1);
  }
  ok(total === 2);
}
{
  const ones = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  })
    .filter((value) => value === 1)
    .at(0);

  let total = 0;
  for await (const one of ones) {
    console.log({ one });
    total += 1;
    ok(one === 1);
  }
  ok(total === 2);
}
{
  const [twos] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  }).filter((value) => value === 2);

  let total = 0;
  for await (const two of twos) {
    console.log({ two });
    total += 1;
    ok(two === 2);
  }
  ok(total === 2);
}
{
  const twos = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  })
    .filter((value) => value === 2)
    .at(0);

  let total = 0;
  for await (const two of twos) {
    console.log({ two });
    total += 1;
    ok(two === 2);
  }
  ok(total === 2);
}
{
  const [two] = await split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  }).filter((value) => value === 2);
  console.log({ two });
  ok(two === 2);
}

{
  const [twos] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  }).filter((value) => value === 2);
  const two = await twos;
  console.log({ two });
  ok(two === 2);
}

{
  const trues = split(
    {
      async *[Symbol.asyncIterator]() {
        yield [1, 2, 3];
        yield [4, 5, 6];
        yield [7, 8, 9];
      },
    },
    {
      empty: false,
    }
  )
    .map((value) => value >= 5)
    .filter(Boolean);

  console.log({ trues });

  let total = 0;

  for await (const snapshot of trues) {
    console.log({ snapshot });
    total += snapshot.length;
  }

  console.log({ total });

  ok(total === 5);
}

{
  const trues = await split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [7, 8, 9];
    },
  })
    .map((value) => value >= 5)
    .filter(Boolean)
    .take(1);

  console.log({ trues });

  ok(trues.length === 2);
}

{
  const result = await split({
    async *[Symbol.asyncIterator]() {
      yield [4, 5, 6];
      yield [1, 8, 9];
    },
  }).find((value) => value >= 5);

  console.log({ result });

  ok(result === 8);
}
{
  const result = await split({
    async *[Symbol.asyncIterator]() {
      yield [4, 5, 6];
      yield [1, 8, 9];
    },
  })
    .filter((value) => value >= 5)
    .take(1) // If we used 2 here, we would get 8 as a result
    .at(0);

  console.log({ result });

  ok(result === 5);
}
{
  const result = await split({
    async *[Symbol.asyncIterator]() {
      yield [4, 5, 6];
      yield [1, 8, 9];
    },
  })
    .filter((value) => value >= 5)
    .take(2)
    .at(0);

  console.log({ result });

  ok(result === 8);
}

{
  const result = await split({
    async *[Symbol.asyncIterator]() {
      while (true) yield 1;
    },
  })
    .take(3)
    .at(0);

  ok(result === 1);
}

{
  const result = await split({
    async *[Symbol.asyncIterator]() {
      for (let i = 0; ; i += 1) {
        yield i;
      }
    },
  })
    .take(100)
    .at(0);
  ok(result === 99);
}

{
  const every = await split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield 1;
    },
  }).every((value) => value === 1);
  console.log({ every });
  ok(every === true);
}
{
  const every = await split({
    async *[Symbol.asyncIterator]() {
      yield 0;
      yield 1;
    },
  }).every((value) => value === 1);
  console.log({ every });
  ok(every === true);
}
{
  // Every can change from false to true, as each split
  // is multiple snapshots of state
  const every = split({
    async *[Symbol.asyncIterator]() {
      yield 0;
      yield 1;
    },
  }).every((value) => value === 1);

  let index = -1;
  for await (const snapshot of every) {
    index += 1;
    console.log({ index, snapshot });
    if (index === 0) {
      ok(!snapshot);
    } else if (index === 1) {
      ok(snapshot);
    }
  }
  console.log({ index });
  ok(index === 1);
}

{
  const every = await split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield 0;
    },
  }).every((value) => value === 1);
  console.log({ every });
  ok(every === false);
}

{
  // Every can change from true to false, as each split
  // is multiple snapshots of state
  const every = split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield 0;
    },
  }).every((value) => value === 1);

  let index = -1;
  for await (const snapshot of every) {
    index += 1;
    console.log({ index, snapshot });
    if (index === 0) {
      ok(snapshot);
    } else if (index === 1) {
      ok(!snapshot);
    }
  }
  console.log({ index });
  ok(index === 1);
}

{
  const index = await split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [0, 1];
    },
  }).findIndex((value) => value === 1);
  ok(index === 1);
}
{
  const index = split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [0, 1];
      yield [0, 0, 1];
    },
  }).findIndex((value) => value === 1);

  let expectedIndex = -1;

  for await (const snapshot of index) {
    expectedIndex += 1;
    ok(snapshot === expectedIndex);
  }

  ok(expectedIndex === 2);
}

{
  const [a, b, c, d, e] = await split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [0, 1];
      yield [0, 0, 1];
    },
  }).concat([2, 3]);

  console.log([a, b, c, d, e]);

  ok(a === 0);
  ok(b == 0);
  ok(c === 1);
  ok(d === 2);
  ok(e === 3);
}
{
  const [a, b, c, d, e] = split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [0, 1];
      yield [0, 0, 1];
    },
  }).concat([2, 3]);

  for await (const snapshot of union([a, b, c, d, e])) {
    const filtered = snapshot.filter((value) => typeof value === "number");
    console.log({ snapshot, filtered });

    if (filtered.length === 3) {
      ok(filtered[0] === 1);
      ok(filtered[1] === 2);
      ok(filtered[2] === 3);
    } else if (filtered.length === 4) {
      ok(filtered[0] == 0);
      ok(filtered[1] === 1);
      ok(filtered[2] === 2);
      ok(filtered[3] === 3);
    } else if (filtered.length === 5) {
      ok(filtered[0] === 0);
      ok(filtered[1] == 0);
      ok(filtered[2] === 1);
      ok(filtered[3] === 2);
      ok(filtered[4] === 3);
    } else {
      ok(false);
    }
  }
}

{
  const result = await split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [0, 1];
      yield [0, 0, 1];
    },
  }).concat({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [0, 1];
      yield [0, 0, 1];
    },
  });

  console.log(result);
  ok(result.length === 6);
}
{
  const [a, b, c, d, e, f] = split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [0, 1];
      yield [0, 0, 1];
    },
  }).concat({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [0, 1];
      yield [0, 0, 1];
    },
  });

  for await (const snapshot of union([a, b, c, d, e, f])) {
    ok(snapshot.length === 6);
    const filtered = snapshot.filter((value) => typeof value === "number");
    console.log({ snapshot, filtered });
    ok(filtered.length >= 1);
  }
}

{
  const [, , c] = split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [2, 1];
      yield [3, 2, 1];
    },
  }).copyWithin(2);

  const result = await c;
  console.log({ result });
  ok(result === 3);
}
{
  const [, , c] = split({
    async *[Symbol.asyncIterator]() {
      yield 1;
      yield [2, 1];
      yield [3, 2, 1];
    },
  })
    .concat([0, 0, 0])
    .copyWithin(2);

  let index = -1;
  for await (const snapshot of c) {
    ok(typeof snapshot === "number");
    index += 1;
    console.log({ index, snapshot });
    if (index === 0) {
      ok(snapshot === 1);
    } else if (index === 1) {
      ok(snapshot === 2);
    } else if (index === 2) {
      ok(snapshot === 3);
    } else {
      ok(false);
    }
  }
}

{
  const expected = Math.random();
  const [a] = split({
    async *[Symbol.asyncIterator]() {
      yield expected;
    },
  }).entries();
  const [index, value] = await a;
  console.log({ index, value });
  ok(index === 0);
  ok(value === expected);
}

{
  const {
    one: [ones],
  } = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  }).group((value) => (value === 1 ? "one" : "unknown"));

  let total = 0;
  for await (const one of ones) {
    console.log({ one });
    total += 1;
    ok(one === 1);
  }
  ok(total === 2);
}

{
  const [ones] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  })
    .groupToMap((value) => (value === 1 ? "one" : "unknown"))
    .get("one");

  let total = 0;
  for await (const one of ones) {
    console.log({ one });
    total += 1;
    ok(one === 1);
  }
  ok(total === 2);
}

{
  const has = await split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  })
    .groupToMap((value) => (value === 1 ? "one" : "unknown"))
    .has("one");
  console.log({ has });
  ok(has);
}
{
  const has = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  })
    .groupToMap((value) => (value === 1 ? "one" : "unknown"))
    .has("one");
  let count = 0;
  let total = 0;
  for await (const snapshot of has) {
    console.log({ has: snapshot });
    total += 1;
    count += snapshot ? 1 : 0;
  }
  console.log({ total });
  ok(count === 2);
}

{
  const [ones] = split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [1, 2, 3];
    },
  })
    .push({
      async *[Symbol.asyncIterator]() {
        yield 1;
      },
    })
    .push({
      async *[Symbol.asyncIterator]() {
        yield 0;
      },
    })
    .push({
      async *[Symbol.asyncIterator]() {
        yield 1;
      },
    })
    .groupToMap((value) => (value === 1 ? "one" : "unknown"))
    .get("one");

  let total = 0;
  for await (const one of ones) {
    console.log({ one });
    total += 1;
    ok(one === 1);
  }
  console.log({ total });
  ok(total === 4);
}

{
  const info = split(
    {
      async *[Symbol.asyncIterator]() {
        console.log("Running");
        yield 1;
        yield 2;
        yield 3;
        console.log("Finished");
      },
    },
    {
      keep: true,
    }
  );

  let initial = 0;
  for await (const snapshot of info) {
    console.log({ snapshot });
    initial += 1;
  }
  console.log({ initial });
  ok(initial === 3);

  let next = 0;
  for await (const snapshot of info) {
    console.log({ snapshot });
    next += 1;
  }
  console.log({ next });
  ok(next === 3);

  const [values] = info;

  let totalSnapshot = 0;
  let total = 0;
  for await (const snapshot of values) {
    console.log({ snapshot });
    totalSnapshot += snapshot;
    total += 1;
  }
  console.log({ total, totalSnapshot });
  ok(total === 3);
  ok(totalSnapshot === 6); // 1 + 2 + 3
}

{
  const input = {
    async * [Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [7, 8, 9];
    }
  }
  const mask = {
    async * [Symbol.asyncIterator]() {
      yield [false, true, false];
      yield [true, false, true];
      yield [false, false, true];
    }
  }

  const result = split(input).mask(mask);

  const seen: unknown[] = [];

  for await (const snapshot of result) {
    ok(isArray(snapshot));
    console.log({ snapshot });
    seen.push(...snapshot);
  }

  console.log({ seen });
  ok(!seen.includes(1));
  ok(seen.includes(2));
  ok(!seen.includes(3));
  ok(seen.includes(4));
  ok(!seen.includes(5));
  ok(seen.includes(6));
  ok(!seen.includes(7));
  ok(!seen.includes(8));
  ok(seen.includes(9));


}


{
  const input = {
    async * [Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
      yield [7, 8, 9];
    }
  }
  const mask = {
    async * [Symbol.asyncIterator]() {
      yield false;
      yield [true, false, true];
      yield true;
    }
  }

  const result = split(input).mask(mask);

  const seen: unknown[] = [];

  for await (const snapshot of result) {
    ok(isArray(snapshot));
    console.log({ snapshot });
    seen.push(...snapshot);
  }

  console.log({ seen });
  ok(!seen.includes(1));
  ok(!seen.includes(2));
  ok(!seen.includes(3));
  ok(seen.includes(4));
  ok(!seen.includes(5));
  ok(seen.includes(6));
  ok(seen.includes(7));
  ok(seen.includes(8));
  ok(seen.includes(9));


}

{
  const last = await split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  }).at(-1);
  console.log({ last });
  ok(last === 6);
}
{
  const middle = await split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  }).at(-2);
  console.log({ middle });
  ok(middle === 5);
}
{
  const first = await split({
    async *[Symbol.asyncIterator]() {
      yield [1, 2, 3];
      yield [4, 5, 6];
    },
  }).at(-3);
  console.log({ first });
  ok(first === 4);
}