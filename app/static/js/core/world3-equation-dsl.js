export function defineStateStock(definition) {
    return {
        kind: "state-stock",
        ...definition,
    };
}
export function defineDerivedStock(definition) {
    return {
        kind: "derived-stock",
        ...definition,
    };
}
