import * as Promise from "./promise";

export { Promise };


export * from "./promise";
export * from "./push";
export * from "./defer";
export * from "./split";

// Core dependency
export {
    union,
    UnionInput,
    UnionOptions
} from "@virtualstate/union";