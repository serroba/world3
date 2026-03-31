export type SavedScenarioState = {
  preset?: string;
  view?: "split" | "combined";
  constants?: Record<string, number>;
  controls?: Record<string, number>;
};

function toBase64Url(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const padding = (4 - (value.length % 4 || 4)) % 4;
  const padded = `${value}${"=".repeat(padding)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return decodeURIComponent(escape(atob(padded)));
}

function sortNumericRecord(
  record: Record<string, number> | undefined,
): Record<string, number> | undefined {
  if (!record || Object.keys(record).length === 0) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => Number.isFinite(value))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function normalizeSavedScenarioState(
  state: SavedScenarioState,
): SavedScenarioState {
  const normalized: SavedScenarioState = {};
  const constants = sortNumericRecord(state.constants);
  const controls = sortNumericRecord(state.controls);

  if (state.preset) {
    normalized.preset = state.preset;
  }
  if (state.view) {
    normalized.view = state.view;
  }
  if (constants) {
    normalized.constants = constants;
  }
  if (controls) {
    normalized.controls = controls;
  }

  return normalized;
}

export function encodeSavedScenarioState(state: SavedScenarioState): string {
  return toBase64Url(JSON.stringify(normalizeSavedScenarioState(state)));
}

export function decodeSavedScenarioState(value: string): SavedScenarioState | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as SavedScenarioState;
    return normalizeSavedScenarioState(parsed);
  } catch {
    return null;
  }
}

export function buildAdvancedScenarioHash(state: SavedScenarioState): string {
  const normalized = normalizeSavedScenarioState(state);
  const params = new URLSearchParams();
  if (normalized.preset) {
    params.set("preset", normalized.preset);
  }
  if (normalized.view) {
    params.set("view", normalized.view);
  }
  if (normalized.constants || normalized.controls) {
    params.set("state", encodeSavedScenarioState(normalized));
  }
  const query = params.toString();
  return query ? `#advanced?${query}` : "#advanced";
}

declare global {
  interface Window {
    ScenarioState: {
      encodeSavedScenarioState: typeof encodeSavedScenarioState;
      decodeSavedScenarioState: typeof decodeSavedScenarioState;
      buildAdvancedScenarioHash: typeof buildAdvancedScenarioHash;
      normalizeSavedScenarioState: typeof normalizeSavedScenarioState;
    };
  }
}

window.ScenarioState = {
  encodeSavedScenarioState,
  decodeSavedScenarioState,
  buildAdvancedScenarioHash,
  normalizeSavedScenarioState,
};
