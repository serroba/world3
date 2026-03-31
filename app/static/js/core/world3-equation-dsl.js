export function requireWorld3RuntimeValue(context, key) {
    const value = context.runtime?.[key];
    if (value === undefined) {
        throw new Error(`Missing runtime value '${key}' for derived equation`);
    }
    return value;
}
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
export function defineDerivedEquation(definition) {
    return {
        kind: "derived-equation",
        ...definition,
    };
}
