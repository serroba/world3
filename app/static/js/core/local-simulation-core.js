import { resolveScenarioRequest, } from "../simulation-contracts.js";
export const LOCAL_PROVIDER_ERROR = "Local simulation currently supports only the standard-run preset without overrides. Switch back to HTTP mode for other scenarios.";
export function hasExplicitOverrides(request) {
    if (!request) {
        return false;
    }
    return Object.entries(request).some(([, value]) => {
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        if (value && typeof value === "object") {
            return Object.keys(value).length > 0;
        }
        return value !== undefined;
    });
}
export function createLocalSimulationCore(modelData, loadStandardRunFixture) {
    return {
        async simulatePreset(name, overrides) {
            if (name === "standard-run" && !hasExplicitOverrides(overrides)) {
                return loadStandardRunFixture();
            }
            throw new Error(`${LOCAL_PROVIDER_ERROR} Requested preset: ${name}.`);
        },
        async simulate(request, options) {
            if (!hasExplicitOverrides(request)) {
                return loadStandardRunFixture(options);
            }
            throw new Error(LOCAL_PROVIDER_ERROR);
        },
        async compare(scenarioA, scenarioB) {
            resolveScenarioRequest(modelData, scenarioA);
            if (scenarioB) {
                resolveScenarioRequest(modelData, scenarioB);
            }
            throw new Error(LOCAL_PROVIDER_ERROR);
        },
    };
}
