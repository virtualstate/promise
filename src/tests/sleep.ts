
export function sleep(timeout: number, arg?: unknown) {
    return new Promise(resolve => setTimeout(resolve, timeout, arg ?? `Slept ${timeout} ms`));
}