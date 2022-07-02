export interface AsyncFn {
    (): Promise<void>
}

export interface Series {
    (fn: AsyncFn): Promise<void>
}

export function series(): Series {
    let promise: Promise<void> | undefined = undefined;
    return async (fn) => {
        const current = promise = run(promise);
        return current;
        async function run(previous?: Promise<void>) {
            if (previous) {
                await previous;
            }
            try {
                return await fn();
            } finally {
                if (promise === current) {

                }
            }
        }
    }
}