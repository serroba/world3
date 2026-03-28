function projectSeriesValues(values, indices, name) {
    return Float64Array.from(indices.map((index) => {
        const value = values[index];
        if (value === undefined) {
            throw new Error(`Fixture series '${name}' is missing a value at index ${index}.`);
        }
        return value;
    }));
}
function deriveSeriesValues(frame, definition) {
    const values = new Float64Array(frame.time.length);
    for (let index = 0; index < frame.time.length; index += 1) {
        const time = frame.time[index];
        if (time === undefined) {
            throw new Error(`Runtime state frame index ${index} is out of bounds.`);
        }
        const observationValues = Object.fromEntries(Array.from(frame.series.entries(), ([name, series]) => {
            const value = series[index];
            if (value === undefined) {
                throw new Error(`Runtime state frame series '${name}' is missing a value at index ${index}.`);
            }
            return [name, value];
        }));
        values[index] = definition.derive({
            index,
            time,
            values: observationValues,
        });
    }
    return values;
}
export function createIoDerivedDefinition() {
    return {
        variable: "io",
        derive: (observation) => {
            const pop = observation.values.pop;
            const iopc = observation.values.iopc;
            if (pop === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'io' because the source variable 'pop' is missing.");
            }
            if (iopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'io' because the source variable 'iopc' is missing.");
            }
            return pop * iopc;
        },
    };
}
export function extendCapitalSourceVariables(sourceVariables, outputVariables, fixture) {
    const canDeriveIo = outputVariables.includes("io") &&
        Boolean(fixture.series.pop) &&
        Boolean(fixture.series.iopc);
    if (canDeriveIo) {
        sourceVariables.add("pop");
        sourceVariables.add("iopc");
    }
    return { canDeriveIo };
}
export function maybePopulateCapitalOutputSeries(variable, sourceFrame, series, fixture, projectedIndices, _prepared, canDeriveIo) {
    if (variable !== "io") {
        return false;
    }
    if (canDeriveIo) {
        series.set("io", deriveSeriesValues(sourceFrame, createIoDerivedDefinition()));
        return true;
    }
    if (fixture.series.io) {
        series.set("io", projectSeriesValues(fixture.series.io.values, projectedIndices, "io"));
        return true;
    }
    throw new Error("Fixture-backed runtime cannot derive 'io' because the source variables 'pop' and 'iopc' are missing.");
}
