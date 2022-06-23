import { Push } from "../push";
import { ok } from "../like";
import {isIterable, isIteratorYieldResult, isRejected} from "../is";
import {anAsyncThing} from "../the-thing";

{
  const push = new Push();

  const iterator = push[Symbol.asyncIterator]();

  push.push(1);
  push.push(2);
  push.close();

  const result1 = await iterator.next();
  console.log({ result1 });
  const result2 = await iterator.next();
  console.log({ result2 });
  const result3 = await iterator.next();
  console.log({ result3 });

  ok(isIteratorYieldResult(result1));
  ok(isIteratorYieldResult(result2));
  ok(!isIteratorYieldResult(result3));
}

{
  async function fn(push: Push<unknown>) {
    const values = [];
    for await (const snapshot of push) {
      console.log({ snapshot });
      values.push(snapshot);
    }
    console.log("done");
    return values;
  }

  {
    const push = new Push();

    const promise = fn(push);

    push.push(1);
    push.push(2);
    push.close();

    const result = await promise;

    ok(result.includes(1));
    ok(result.includes(2));
  }

  {
    const push = new Push();

    await new Promise<void>(queueMicrotask);
    await new Promise<void>(queueMicrotask);

    const promise = fn(push);

    push.push(1);
    push.push(2);
    push.close();

    const result = await promise;

    ok(result.includes(1));
    ok(result.includes(2));
  }
}

{
  const push = new Push();
  push.close();
  const iterator = push[Symbol.asyncIterator]();
  const { done } = await iterator.next();
  ok(done);
}

{
  const push = new Push();
  const iterator = push[Symbol.asyncIterator]();
  const promise = iterator.next();

  await new Promise<void>(queueMicrotask);
  await new Promise<void>(queueMicrotask);

  push.push(1);

  const result = await promise;

  ok(isIteratorYieldResult(result));

  const nextPromise = iterator.next();

  await new Promise<void>(queueMicrotask);
  await new Promise<void>(queueMicrotask);

  push.push(2);

  ok(isIteratorYieldResult(await nextPromise));

  const donePromise = iterator.next();

  await new Promise<void>(queueMicrotask);
  await new Promise<void>(queueMicrotask);

  push.close();

  ok(!isIteratorYieldResult(await donePromise));

  ok(!isIteratorYieldResult(await iterator.return()));
}

{
  const push = new Push();
  push.push(1);
  push.push(2);
  push.throw("3");
  const iterator = push[Symbol.asyncIterator]();
  ok(isIteratorYieldResult(await iterator.next()));
  ok(isIteratorYieldResult(await iterator.next()));

  const [status] = await Promise.allSettled([iterator.next()])
  ok(isRejected(status));
  ok(status.reason === "3")

}

{
  const push = new Push();
  const thing = anAsyncThing(push);

  push.push(1);
  push.push(2);
  push.close();

  const two = await thing;

  ok(two === 2);

}
{
  const push = new Push();
  const thing = anAsyncThing(push);

  push.push(1);
  push.push(2);
  push.push(3);
  push.close();

  for await (const snapshot of thing) {
    console.log({ snapshot });
    ok(snapshot === 1 || snapshot === 2 || snapshot === 3);
  }

}