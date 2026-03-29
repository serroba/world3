const DEFAULT_AGRICULTURE_POLICY_YEAR = 1975;
export const AGRICULTURE_HIDDEN_SERIES = {
    aiph: "__aiph",
    ifpc: "__ifpc",
    lymap: "__lymap",
    lymc: "__lymc",
    lyf: "__lyf",
};
function clipAtPolicyYear(beforeValue, afterValue, time, policyYear) {
    return time > policyYear ? afterValue : beforeValue;
}
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
export function createFoodDerivedDefinition(constantsUsed) {
    return {
        variable: "f",
        derive: (observation) => {
            const ly = observation.values.ly;
            const al = observation.values.al;
            if (ly === undefined || al === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'f' because 'ly' or 'al' is missing.");
            }
            const lfh = constantsUsed.lfh ?? 0.7;
            const pl = constantsUsed.pl ?? 0.1;
            return ly * al * lfh * (1 - pl);
        },
    };
}
export function createAiphDerivedDefinition() {
    return {
        variable: AGRICULTURE_HIDDEN_SERIES.aiph,
        derive: (observation) => {
            const ai = observation.values.ai;
            const falm = observation.values.falm;
            const al = observation.values.al;
            if (ai === undefined || falm === undefined || al === undefined || al === 0) {
                throw new Error("Fixture-backed runtime cannot derive '__aiph' because 'ai', 'falm', or 'al' is missing or zero.");
            }
            return ai * (1 - falm) / al;
        },
    };
}
export function createLymcDerivedDefinition(lymcLookup) {
    return {
        variable: AGRICULTURE_HIDDEN_SERIES.lymc,
        derive: (observation) => {
            const aiph = observation.values[AGRICULTURE_HIDDEN_SERIES.aiph];
            if (aiph === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__lymc' because '__aiph' is missing.");
            }
            return lymcLookup.evaluate(aiph);
        },
    };
}
export function createLyfDerivedDefinition(constantsUsed, policyYear = DEFAULT_AGRICULTURE_POLICY_YEAR) {
    return {
        variable: AGRICULTURE_HIDDEN_SERIES.lyf,
        derive: (observation) => clipAtPolicyYear(constantsUsed.lyf1 ?? 1, constantsUsed.lyf2 ?? 1, observation.time, policyYear),
    };
}
export function createLymapDerivedDefinition(constantsUsed, lymap1Lookup, lymap2Lookup, policyYear = DEFAULT_AGRICULTURE_POLICY_YEAR) {
    return {
        variable: AGRICULTURE_HIDDEN_SERIES.lymap,
        derive: (observation) => {
            const io = observation.values.io;
            const io70 = constantsUsed.io70;
            if (io === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__lymap' because 'io' is missing.");
            }
            if (io70 === undefined || io70 === 0) {
                throw new Error("Fixture-backed runtime cannot derive '__lymap' because constant 'io70' is missing or zero.");
            }
            const ioRatio = io / io70;
            return clipAtPolicyYear(lymap1Lookup.evaluate(ioRatio), lymap2Lookup.evaluate(ioRatio), observation.time, policyYear);
        },
    };
}
export function createLyDerivedDefinition() {
    return {
        variable: "ly",
        derive: (observation) => {
            const lyf = observation.values[AGRICULTURE_HIDDEN_SERIES.lyf];
            const lfert = observation.values.lfert;
            const lymc = observation.values[AGRICULTURE_HIDDEN_SERIES.lymc];
            const lymap = observation.values[AGRICULTURE_HIDDEN_SERIES.lymap];
            if (lyf === undefined ||
                lfert === undefined ||
                lymc === undefined ||
                lymap === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'ly' because productivity inputs are missing.");
            }
            return lyf * lfert * lymc * lymap;
        },
    };
}
export function createFoodPerCapitaDerivedDefinition() {
    return {
        variable: "fpc",
        derive: (observation) => {
            const f = observation.values.f;
            const pop = observation.values.pop;
            if (f === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'fpc' because the source variable 'f' is missing.");
            }
            if (pop === undefined || pop === 0) {
                throw new Error("Fixture-backed runtime cannot derive 'fpc' because the source variable 'pop' is missing or zero.");
            }
            return f / pop;
        },
    };
}
export function createIfpcDerivedDefinition(ifpc1Lookup, ifpc2Lookup, policyYear = DEFAULT_AGRICULTURE_POLICY_YEAR) {
    return {
        variable: AGRICULTURE_HIDDEN_SERIES.ifpc,
        derive: (observation) => {
            const iopc = observation.values.iopc;
            if (iopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__ifpc' because the source variable 'iopc' is missing.");
            }
            return clipAtPolicyYear(ifpc1Lookup.evaluate(iopc), ifpc2Lookup.evaluate(iopc), observation.time, policyYear);
        },
    };
}
export function createFioaaDerivedDefinition(fioaa1Lookup, fioaa2Lookup, policyYear = DEFAULT_AGRICULTURE_POLICY_YEAR) {
    return {
        variable: "fioaa",
        derive: (observation) => {
            const fpc = observation.values.fpc;
            const ifpc = observation.values[AGRICULTURE_HIDDEN_SERIES.ifpc];
            if (fpc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'fioaa' because the source variable 'fpc' is missing.");
            }
            if (ifpc === undefined || ifpc === 0) {
                throw new Error("Fixture-backed runtime cannot derive 'fioaa' because the source variable '__ifpc' is missing or zero.");
            }
            return clipAtPolicyYear(fioaa1Lookup.evaluate(fpc / ifpc), fioaa2Lookup.evaluate(fpc / ifpc), observation.time, policyYear);
        },
    };
}
export function createTaiDerivedDefinition() {
    return {
        variable: "tai",
        derive: (observation) => {
            const io = observation.values.io;
            const fioaa = observation.values.fioaa;
            if (io === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'tai' because the source variable 'io' is missing.");
            }
            if (fioaa === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'tai' because the source variable 'fioaa' is missing.");
            }
            return io * fioaa;
        },
    };
}
export function extendAgricultureSourceVariables(sourceVariables, outputVariables, fixture, lookupLibrary, needsNativeFoodPath = false) {
    const needsAgricultureFoodPath = needsNativeFoodPath ||
        outputVariables.includes("f") ||
        outputVariables.includes("fpc") ||
        outputVariables.includes("fioaa") ||
        outputVariables.includes("tai");
    const canUseNativeFoodPath = needsAgricultureFoodPath &&
        Boolean(fixture.series.al) &&
        Boolean(fixture.series.ly) &&
        Boolean(fixture.series.pop);
    if (canUseNativeFoodPath) {
        sourceVariables.add("al");
        sourceVariables.add("ly");
        sourceVariables.add("pop");
    }
    const canUseNativeAgriculturalAllocation = (outputVariables.includes("fioaa") || outputVariables.includes("tai")) &&
        canUseNativeFoodPath &&
        Boolean(fixture.series.io) &&
        Boolean(fixture.series.iopc) &&
        Boolean(lookupLibrary?.has("IFPC1")) &&
        Boolean(lookupLibrary?.has("IFPC2")) &&
        Boolean(lookupLibrary?.has("FIOAA1")) &&
        Boolean(lookupLibrary?.has("FIOAA2"));
    if (canUseNativeAgriculturalAllocation) {
        sourceVariables.add("io");
        sourceVariables.add("iopc");
    }
    const canUseNativeAgricultureProductivity = (outputVariables.includes("ly") || canUseNativeFoodPath) &&
        Boolean(fixture.series.ai) &&
        Boolean(fixture.series.falm) &&
        Boolean(fixture.series.al) &&
        Boolean(fixture.series.io) &&
        Boolean(fixture.series.lfert) &&
        Boolean(lookupLibrary?.has("LYMC")) &&
        Boolean(lookupLibrary?.has("LYMAP1")) &&
        Boolean(lookupLibrary?.has("LYMAP2")) &&
        fixture.constants_used.io70 !== undefined;
    if (canUseNativeAgricultureProductivity) {
        sourceVariables.add("al");
        sourceVariables.add("ai");
        sourceVariables.add("falm");
        sourceVariables.add("io");
        sourceVariables.add("lfert");
    }
    return {
        canUseNativeFoodPath,
        canUseNativeAgriculturalAllocation,
        canUseNativeAgricultureProductivity,
    };
}
export function populateAgricultureNativeSupportSeries(sourceFrame, sourceSeries, prepared, constantsUsed, canUseNativeFoodPath, canUseNativeAgriculturalAllocation, canUseNativeAgricultureProductivity) {
    if (!canUseNativeFoodPath && !canUseNativeAgricultureProductivity) {
        return;
    }
    if (canUseNativeAgricultureProductivity) {
        const lymcLookup = prepared.lookupLibrary.get("LYMC");
        const lymap1Lookup = prepared.lookupLibrary.get("LYMAP1");
        const lymap2Lookup = prepared.lookupLibrary.get("LYMAP2");
        if (lymcLookup && lymap1Lookup && lymap2Lookup) {
            sourceSeries.set(AGRICULTURE_HIDDEN_SERIES.aiph, deriveSeriesValues(sourceFrame, createAiphDerivedDefinition()));
            const productivityFrame = {
                request: sourceFrame.request,
                time: sourceFrame.time,
                constantsUsed,
                series: sourceSeries,
            };
            sourceSeries.set(AGRICULTURE_HIDDEN_SERIES.lymc, deriveSeriesValues(productivityFrame, createLymcDerivedDefinition(lymcLookup)));
            sourceSeries.set(AGRICULTURE_HIDDEN_SERIES.lyf, deriveSeriesValues(productivityFrame, createLyfDerivedDefinition(constantsUsed, prepared.request.pyear ?? DEFAULT_AGRICULTURE_POLICY_YEAR)));
            sourceSeries.set(AGRICULTURE_HIDDEN_SERIES.lymap, deriveSeriesValues(productivityFrame, createLymapDerivedDefinition(constantsUsed, lymap1Lookup, lymap2Lookup, prepared.request.pyear ?? DEFAULT_AGRICULTURE_POLICY_YEAR)));
            const lyFrame = {
                request: sourceFrame.request,
                time: sourceFrame.time,
                constantsUsed,
                series: sourceSeries,
            };
            sourceSeries.set("ly", deriveSeriesValues(lyFrame, createLyDerivedDefinition()));
        }
    }
    if (!canUseNativeFoodPath) {
        return;
    }
    sourceSeries.set("f", deriveSeriesValues(sourceFrame, createFoodDerivedDefinition(constantsUsed)));
    const foodFrame = {
        request: sourceFrame.request,
        time: sourceFrame.time,
        constantsUsed,
        series: sourceSeries,
    };
    sourceSeries.set("fpc", deriveSeriesValues(foodFrame, createFoodPerCapitaDerivedDefinition()));
    if (!canUseNativeAgriculturalAllocation) {
        return;
    }
    const ifpc1Lookup = prepared.lookupLibrary.get("IFPC1");
    const ifpc2Lookup = prepared.lookupLibrary.get("IFPC2");
    const fioaa1Lookup = prepared.lookupLibrary.get("FIOAA1");
    const fioaa2Lookup = prepared.lookupLibrary.get("FIOAA2");
    if (!ifpc1Lookup || !ifpc2Lookup || !fioaa1Lookup || !fioaa2Lookup) {
        return;
    }
    sourceSeries.set(AGRICULTURE_HIDDEN_SERIES.ifpc, deriveSeriesValues(foodFrame, createIfpcDerivedDefinition(ifpc1Lookup, ifpc2Lookup, prepared.request.pyear ?? DEFAULT_AGRICULTURE_POLICY_YEAR)));
    const allocationFrame = {
        request: sourceFrame.request,
        time: sourceFrame.time,
        constantsUsed,
        series: sourceSeries,
    };
    sourceSeries.set("fioaa", deriveSeriesValues(allocationFrame, createFioaaDerivedDefinition(fioaa1Lookup, fioaa2Lookup, prepared.request.pyear ?? DEFAULT_AGRICULTURE_POLICY_YEAR)));
    sourceSeries.set("tai", deriveSeriesValues(allocationFrame, createTaiDerivedDefinition()));
}
export function maybePopulateAgricultureOutputSeries(variable, sourceFrame, series, fixture, projectedIndices) {
    if (!["f", "fpc", "fioaa", "tai", "ly"].includes(variable)) {
        return false;
    }
    const values = sourceFrame.series.get(variable);
    if (values) {
        series.set(variable, values);
        return true;
    }
    const fixtureSeries = fixture.series[variable];
    if (!fixtureSeries) {
        return false;
    }
    series.set(variable, projectSeriesValues(fixtureSeries.values, projectedIndices, variable));
    return true;
}
