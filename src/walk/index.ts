import { Push, PushOptions } from "../push";
import { series } from "../series";

export interface Walk<T> extends AsyncIterable<T> {
  push(source: AsyncIterable<T>): unknown;
  throw(reason?: unknown): unknown;
  break(): void;
  close(): unknown;
}

export interface WalkOptions extends PushOptions {}

export class Walk<T> implements Walk<T> {
  private readonly target: Push<T>;

  private series = series();

  constructor(options?: WalkOptions) {
    this.target = new Push(options);
  }

  push(source: AsyncIterable<T>): unknown {
    return this.series(async () => {
      if (!this.target.open) return;
      await this.target.wait();
      try {
        for await (const snapshot of source) {
          if (!this.target.open) break;
          await this.target.push(snapshot);
          if (!this.target.open) break;
        }
      } catch (error) {
        await this.target.throw(error);
        throw error;
      }
    });
  }

  throw(reason?: unknown) {
    return this.target.throw(reason);
  }

  break() {
    return this.target.break();
  }

  close(): unknown {
    return this.series(async () => {
      await this.target.close();
    });
  }

  async *[Symbol.asyncIterator]() {
    yield* this.target;
  }
}
