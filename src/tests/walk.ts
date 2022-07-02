import { Walk } from "../walk";

const walk = new Walk()

walk.push({
    async *[Symbol.asyncIterator]() {
        yield 1;
        yield 2;
    }
});
walk.push({
    async *[Symbol.asyncIterator]() {
        yield 3;
        yield 4;
    }
});
walk.close();

let values = [];
for await (const value of walk) {
    values.push(value);
}

console.log({ values });