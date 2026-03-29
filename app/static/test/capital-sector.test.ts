import { describe, expect, test } from "vitest";

import {
  createIoDerivedDefinition,
  extendCapitalSourceVariables,
  maybePopulateCapitalOutputSeries,
  prepareRuntime,
} from "../ts/core/index.ts";
import { ModelData } from "../ts/model-data.ts";
import type { RuntimeStateFrame } from "../ts/core/index.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: {},
  series: {
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    iopc: { name: "iopc", values: [1, 1.5, 2, 2.5, 3] },
    io: { name: "io", values: [10, 18, 28, 40, 54] },
  },
};

describe("capital sector core", () => {
  test("extends runtime source requirements for io derivation", () => {
    const sourceVariables = new Set<string>();

    const result = extendCapitalSourceVariables(
      sourceVariables,
      ["io"],
      fixture,
    );

    expect(result).toEqual({ canDeriveIo: true });
    expect(Array.from(sourceVariables).sort()).toEqual(["iopc", "pop"]);
  });

  test("derives io from pop and iopc", () => {
    const definition = createIoDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: { pop: 10, iopc: 1.5 },
      }),
    ).toBe(15);
  });

  test("populates io natively when source variables are present", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["io"] },
      [],
    );
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: new Map([
        ["pop", Float64Array.from([10, 14, 18])],
        ["iopc", Float64Array.from([1, 2, 3])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const handled = maybePopulateCapitalOutputSeries(
      "io",
      sourceFrame,
      series,
      fixture,
      [0, 2, 4],
      prepared,
      true,
    );

    expect(handled).toBe(true);
    expect(Array.from(series.get("io") ?? [])).toEqual([10, 28, 54]);
  });
});
