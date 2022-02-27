import { all, allSettled } from "../";

{
    // logs []
    console.log(await all());
// logs [1, 2]
    console.log(await all(Promise.resolve(1), Promise.resolve(2)));
// logs rejected
    console.log(
        await all(Promise.resolve(1), Promise.reject(2))
            .catch(() => "rejected")
    );
}

{
    const wait = (timeout = 1, arg: unknown = undefined) => new Promise(resolve => setTimeout(resolve, timeout, arg));

    for await (const state of all(
        wait(10, "first index, second resolve"),
        wait(1, "second index, first resolve")
    )) {
        /*
        logs
        { state: [undefined, "second index, first resolve"] }
        { state: ["first index, second resolve", "second index, first resolve"] }
         */
        console.log({ state });
    }
}

{

    // logs []
    console.log(await allSettled());
// logs [
//   { value: 1, status: 'fulfilled' },
//   { value: 2, status: 'fulfilled' }
// ]
    console.log(await allSettled(Promise.resolve(1), Promise.resolve(2)));
// logs [
//   { value: 1, status: 'fulfilled' },
//   { reason: 2, status: 'rejected' }
// ]
    console.log(await allSettled(Promise.resolve(1), Promise.reject(2)));
}

{

    const wait = (timeout = 1, arg: unknown = undefined) => new Promise(resolve => setTimeout(resolve, timeout, arg));

    for await (const state of allSettled(
        wait(10, "A"),
        wait(1, "B"),
        wait(15).then(() => Promise.reject("C"))
    )) {
        /*
        logs
        {
          state: [ undefined, { value: 'B', status: 'fulfilled' }, undefined ]
        }
        {
          state: [
            { value: 'A', status: 'fulfilled' },
            { value: 'B', status: 'fulfilled' },
            undefined
          ]
        }
        {
          state: [
            { value: 'A', status: 'fulfilled' },
            { value: 'B', status: 'fulfilled' },
            { reason: 'C', status: 'rejected' }
          ]
        }
         */
        console.log({ state });
    }
}