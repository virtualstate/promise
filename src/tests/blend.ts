import { blend } from "../blend";
import {all} from "../all";

{
    const blender = blend();

    blender.source({
        async * [Symbol.asyncIterator]() {
            yield 1;
            yield 1;
            yield 1;
            yield 1;
        }
    });
    blender.source({
        async * [Symbol.asyncIterator]() {
            yield 2;
            yield 3;
            yield 4;
            yield 5;
        }
    });
    blender.source({
        async * [Symbol.asyncIterator]() {
            yield 9;
            yield 6;
            yield 3;
            yield 1;
        }
    });
    blender.target(console.log);
    blender.target(console.log);
    blender.target(console.log);

    const blended = blender.connect();

    console.log({ blended });

    await all(...blended.map(({ promise }) => promise));

}