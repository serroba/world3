function toBase64Url(value) {
    return btoa(unescape(encodeURIComponent(value)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
function fromBase64Url(value) {
    const padding = (4 - (value.length % 4 || 4)) % 4;
    const padded = `${value}${"=".repeat(padding)}`
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    return decodeURIComponent(escape(atob(padded)));
}
function sortNumericRecord(record) {
    if (!record || Object.keys(record).length === 0) {
        return undefined;
    }
    return Object.fromEntries(Object.entries(record)
        .filter(([, value]) => Number.isFinite(value))
        .sort(([left], [right]) => left.localeCompare(right)));
}
export function normalizeSavedScenarioState(state) {
    const normalized = {};
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
export function encodeSavedScenarioState(state) {
    return toBase64Url(JSON.stringify(normalizeSavedScenarioState(state)));
}
export function decodeSavedScenarioState(value) {
    if (!value) {
        return null;
    }
    try {
        const parsed = JSON.parse(fromBase64Url(value));
        return normalizeSavedScenarioState(parsed);
    }
    catch {
        return null;
    }
}
export function buildAdvancedScenarioHash(state) {
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
window.ScenarioState = {
    encodeSavedScenarioState,
    decodeSavedScenarioState,
    buildAdvancedScenarioHash,
    normalizeSavedScenarioState,
};
