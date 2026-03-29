import { describe, expect, test } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  AGRICULTURE_HIDDEN_SERIES,
  populateAgricultureNativeSupportSeries,
  prepareRuntime,
} from "../ts/core/index.ts";
import type { RuntimeStateFrame, RawLookupTable } from "../ts/core/index.ts";

const tables: RawLookupTable[] = [
  {
    sector: "Agriculture",
    "x.name": "IOPC",
    "x.values": [0, 100, 200],
    "y.name": "IFPC1",
    "y.values": [100, 200, 300],
  },
  {
    sector: "Agriculture",
    "x.name": "IOPC",
    "x.values": [0, 100, 200],
    "y.name": "IFPC2",
    "y.values": [100, 200, 300],
  },
  {
    sector: "Agriculture",
    "x.name": "FPCR",
    "x.values": [0, 1, 2],
    "y.name": "FIOAA1",
    "y.values": [0.1, 0.2, 0.3],
  },
  {
    sector: "Agriculture",
    "x.name": "FPCR",
    "x.values": [0, 1, 2],
    "y.name": "FIOAA2",
    "y.values": [0.1, 0.2, 0.3],
  },
  {
    sector: "Agriculture",
    "x.name": "AIPH",
    "x.values": [0, 20, 40],
    "y.name": "LYMC",
    "y.values": [1, 1.5, 2],
  },
  {
    sector: "Agriculture",
    "x.name": "IOR",
    "x.values": [0, 1, 2],
    "y.name": "LYMAP1",
    "y.values": [1, 1.2, 1.4],
  },
  {
    sector: "Agriculture",
    "x.name": "IOR",
    "x.values": [0, 1, 2],
    "y.name": "LYMAP2",
    "y.values": [1, 1.2, 1.4],
  },
];

describe("agriculture-sector", () => {
  test("populates native productivity, food, and allocation support", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1901,
        dt: 1,
        output_variables: ["ly", "fpc", "fioaa", "tai"],
      },
      tables,
    );

    const sourceSeries = new Map<string, Float64Array>([
      ["al", Float64Array.from([10, 12])],
      ["pop", Float64Array.from([10, 12])],
      ["io", Float64Array.from([1000, 1100])],
      ["iopc", Float64Array.from([100, 110])],
      ["ai", Float64Array.from([200, 240])],
      ["falm", Float64Array.from([0.2, 0.25])],
      ["lfert", Float64Array.from([600, 620])],
    ]);

    const frame: RuntimeStateFrame = {
      request: prepared.request,
      time: prepared.time,
      constantsUsed: { lfh: 0.7, pl: 0.1, io70: 1000, lyf1: 1, lyf2: 1 },
      series: sourceSeries,
    };

    populateAgricultureNativeSupportSeries(
      frame,
      sourceSeries,
      prepared,
      frame.constantsUsed,
      true,
      true,
      true,
    );

    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.aiph) ?? [])).toEqual(
      expect.arrayContaining([16, expect.closeTo(15, 10)]),
    );
    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.lymc) ?? [])).toEqual(
      expect.arrayContaining([1.4, expect.closeTo(1.375, 10)]),
    );
    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.lymap) ?? [])).toEqual(
      expect.arrayContaining([1.2, expect.closeTo(1.22, 10)]),
    );
    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.lyf) ?? [])).toEqual([1, 1]);
    expect(Array.from(sourceSeries.get("ly") ?? [])).toEqual(
      expect.arrayContaining([1008, expect.closeTo(1040.05, 10)]),
    );
    expect(Array.from(sourceSeries.get("f") ?? [])).toEqual(
      expect.arrayContaining([expect.closeTo(6350.4, 10), expect.closeTo(7862.778, 10)]),
    );
    expect(Array.from(sourceSeries.get("fpc") ?? [])).toEqual(
      expect.arrayContaining([expect.closeTo(635.04, 10), expect.closeTo(655.2315, 10)]),
    );
    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.ifpc) ?? [])).toEqual([200, 210]);
    expect(Array.from(sourceSeries.get("fioaa") ?? [])).toEqual(
      expect.arrayContaining([expect.closeTo(0.3, 10), expect.closeTo(0.3, 10)]),
    );
    expect(Array.from(sourceSeries.get("tai") ?? [])).toEqual(
      expect.arrayContaining([300, expect.closeTo(330, 10)]),
    );
  });
});
