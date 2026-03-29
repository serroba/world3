import type { SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import type {
  RuntimeDerivedDefinition,
  RuntimeObservation,
  RuntimeStateFrame,
} from "./runtime-state-frame.js";

function projectSeriesValues(values: number[], indices: number[], name: string): Float64Array {
  return Float64Array.from(
    indices.map((index) => {
      const value = values[index];
      if (value === undefined) {
        throw new Error(
          `Fixture series '${name}' is missing a value at index ${index}.`,
        );
      }
      return value;
    }),
  );
}

function deriveSeriesValues(
  frame: RuntimeStateFrame,
  definition: RuntimeDerivedDefinition,
): Float64Array {
  const values = new Float64Array(frame.time.length);

  for (let index = 0; index < frame.time.length; index += 1) {
    const time = frame.time[index];
    if (time === undefined) {
      throw new Error(`Runtime state frame index ${index} is out of bounds.`);
    }

    const observationValues = Object.fromEntries(
      Array.from(frame.series.entries(), ([name, series]) => {
        const value = series[index];
        if (value === undefined) {
          throw new Error(
            `Runtime state frame series '${name}' is missing a value at index ${index}.`,
          );
        }
        return [name, value];
      }),
    );

    values[index] = definition.derive({
      index,
      time,
      values: observationValues,
    });
  }

  return values;
}

export function createIoDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "io",
    derive: (observation: RuntimeObservation) => {
      const pop = observation.values.pop;
      const iopc = observation.values.iopc;
      if (pop === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'io' because the source variable 'pop' is missing.",
        );
      }
      if (iopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'io' because the source variable 'iopc' is missing.",
        );
      }
      return pop * iopc;
    },
  };
}

export function extendCapitalSourceVariables(
  sourceVariables: Set<string>,
  outputVariables: string[],
  fixture: SimulationResult,
): { canDeriveIo: boolean } {
  const canDeriveIo =
    outputVariables.includes("io") &&
    Boolean(fixture.series.pop) &&
    Boolean(fixture.series.iopc);

  if (canDeriveIo) {
    sourceVariables.add("pop");
    sourceVariables.add("iopc");
  }

  return { canDeriveIo };
}

export function maybePopulateCapitalOutputSeries(
  variable: string,
  sourceFrame: RuntimeStateFrame,
  series: Map<string, Float64Array>,
  fixture: SimulationResult,
  projectedIndices: number[],
  _prepared: RuntimePreparation,
  canDeriveIo: boolean,
): boolean {
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

  throw new Error(
    "Fixture-backed runtime cannot derive 'io' because the source variables 'pop' and 'iopc' are missing.",
  );
}
