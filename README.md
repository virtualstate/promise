# `@virtualstate/promise`

> Psst... There is a blog post at [fabiancook.dev](https://fabiancook.dev/2022/02/26/an-async-thing) with details on how 
> this project came to be, and the steps taken during implementation to define the included functionality. 

[//]: # (badges)

### Support

 ![Node.js supported](https://img.shields.io/badge/node-%3E%3D16.0.0-blue) ![Deno supported](https://img.shields.io/badge/deno-%3E%3D1.17.0-blue) 

### Test Coverage

 ![98.6%25 lines covered](https://img.shields.io/badge/lines-98.6%25-brightgreen) ![98.6%25 statements covered](https://img.shields.io/badge/statements-98.6%25-brightgreen) ![97.45%25 functions covered](https://img.shields.io/badge/functions-97.45%25-brightgreen) ![98.35%25 branches covered](https://img.shields.io/badge/branches-98.35%25-brightgreen)

[//]: # (badges)

## `all`

```typescript
import { all } from "@virtualstate/promise";

// logs []
console.log(await all());
// logs [1, 2]
console.log(await all(Promise.resolve(1), Promise.resolve(2)));
// logs rejected
console.log(
    await all(Promise.resolve(1), Promise.reject(2))
        .catch(() => "rejected")
);
```

```typescript

const wait = (timeout = 1, arg = undefined) => new Promise(resolve => setTimeout(resolve, timeout, arg));

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
```


## `allSettled`

```typescript
import { allSettled } from "@virtualstate/promise";

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
```

```typescript

const wait = (timeout = 1, arg = undefined) => new Promise(resolve => setTimeout(resolve, timeout, arg));

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
```

## Contributing

Please see [Contributing](./CONTRIBUTING.md)

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct listed here](./CODE-OF-CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@fabiancook.dev](mailto:conduct@fabiancook.dev).

## Licence

This repository is licensed under the [MIT](https://choosealicense.com/licenses/mit/) license.
