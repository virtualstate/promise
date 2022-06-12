export function sleep<T>(timeout: number, arg: T): Promise<T>;
export function sleep(timeout: number): Promise<void>;
export function sleep<T>(timeout: number, arg?: T) {
  return new Promise<T>((resolve) =>
    setTimeout(() => resolve(arg), timeout, arg ?? `Slept ${timeout} ms`)
  );
}
