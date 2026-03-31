import { describe, expect, test } from "vitest";

import {
  buildAdvancedScenarioHash,
  decodeSavedScenarioState,
  encodeSavedScenarioState,
  normalizeSavedScenarioState,
} from "../ts/scenario-state.ts";

describe("scenario state", () => {
  test("encodes and decodes saved scenario state", () => {
    const original = {
      preset: "standard-run",
      view: "combined" as const,
      constants: { dcfsn: 2, len: 40 },
      controls: { dt: 1, pyear: 2000 },
    };

    const encoded = encodeSavedScenarioState(original);
    expect(decodeSavedScenarioState(encoded)).toEqual(original);
  });

  test("normalizes empty records away", () => {
    expect(
      normalizeSavedScenarioState({
        preset: "standard-run",
        constants: {},
        controls: {},
      }),
    ).toEqual({
      preset: "standard-run",
      view: undefined,
      constants: undefined,
      controls: undefined,
    });
  });

  test("builds an advanced hash with serialized state", () => {
    const hash = buildAdvancedScenarioHash({
      preset: "standard-run",
      view: "combined",
      constants: { len: 40 },
      controls: { pyear: 2000 },
    });

    expect(hash).toContain("#advanced?");
    expect(hash).toContain("preset=standard-run");
    expect(hash).toContain("view=combined");
    expect(hash).toContain("state=");
  });
});
