/**
 * Simulation provider seam.
 *
 * HTTP remains the default implementation for now. This lets us move the UI
 * onto a stable abstraction before introducing a browser-native engine.
 */
import { createLocalSimulationCore, } from "./core/local-simulation-core.js";
const HttpSimulationProvider = {
    mode: "http",
    async simulatePreset(name, overrides) {
        return getApi().simulatePreset(name, overrides);
    },
    async simulate(request, options) {
        return getApi().simulate(request, options);
    },
    async compare(scenarioA, scenarioB) {
        return getApi().compare(scenarioA, scenarioB);
    },
};
const LOCAL_STANDARD_RUN_FIXTURE_URL = "/data/standard-run-explore.json";
let localStandardRunFixturePromise = null;
function getApi() {
    if (!window.API) {
        throw new Error("HTTP API client is not available on window.");
    }
    return window.API;
}
async function loadLocalStandardRunFixture(signal) {
    if (!localStandardRunFixturePromise) {
        const init = {};
        if (signal !== undefined) {
            init.signal = signal;
        }
        localStandardRunFixturePromise = fetch(LOCAL_STANDARD_RUN_FIXTURE_URL, init)
            .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Failed to load local simulation fixture (${response.status})`);
            }
            return response.json();
        })
            .catch((error) => {
            localStandardRunFixturePromise = null;
            throw error;
        });
    }
    return localStandardRunFixturePromise;
}
function createBrowserFixtureLoader() {
    return async (options) => loadLocalStandardRunFixture(options?.signal);
}
function createLocalSimulationProvider(modelData) {
    const localCore = createLocalSimulationCore(modelData, createBrowserFixtureLoader());
    return {
        mode: "local",
        simulatePreset: localCore.simulatePreset,
        simulate: localCore.simulate,
        compare: localCore.compare,
    };
}
function resolveProviderMode() {
    return window.__PYWORLD3_PROVIDER_MODE__ === "local" ? "local" : "http";
}
export function createSimulationProvider(modelData) {
    return resolveProviderMode() === "local"
        ? createLocalSimulationProvider(modelData)
        : HttpSimulationProvider;
}
export const SimulationProvider = resolveProviderMode() === "local"
    ? null
    : HttpSimulationProvider;
