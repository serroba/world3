/**
 * Simulation provider seam.
 *
 * HTTP remains the default implementation for now. This lets us move the UI
 * onto a stable abstraction before introducing a browser-native engine.
 */

import {
  type CompareResult,
  type ModelDataPayload,
  type ScenarioSpec,
  type SimulationRequest,
  type SimulationResult,
} from "./simulation-contracts.js";
import {
  createLocalSimulationCore,
  type LocalSimulationLoader,
} from "./core/local-simulation-core.js";

export type ProviderMode = "http" | "local";

export type SimulationProviderApi = {
  mode: ProviderMode;
  simulatePreset: (
    name: string,
    overrides?: SimulationRequest,
  ) => Promise<SimulationResult>;
  simulate: (
    request?: SimulationRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>;
  compare: (
    scenarioA: ScenarioSpec,
    scenarioB?: ScenarioSpec,
  ) => Promise<CompareResult>;
};

type HttpApi = {
  simulatePreset: (
    name: string,
    overrides?: SimulationRequest,
  ) => Promise<SimulationResult>;
  simulate: (
    request?: SimulationRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>;
  compare: (
    scenarioA: ScenarioSpec,
    scenarioB?: ScenarioSpec,
  ) => Promise<CompareResult>;
};

declare global {
  interface Window {
    SimulationProvider: SimulationProviderApi;
    __PYWORLD3_PROVIDER_MODE__?: ProviderMode;
    API?: HttpApi;
  }
}

const HttpSimulationProvider: SimulationProviderApi = {
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
let localStandardRunFixturePromise: Promise<SimulationResult> | null = null;

function getApi(): HttpApi {
  if (!window.API) {
    throw new Error("HTTP API client is not available on window.");
  }
  return window.API;
}

async function loadLocalStandardRunFixture(
  signal?: AbortSignal,
): Promise<SimulationResult> {
  if (!localStandardRunFixturePromise) {
    const init: RequestInit = {};
    if (signal !== undefined) {
      init.signal = signal;
    }

    localStandardRunFixturePromise = fetch(LOCAL_STANDARD_RUN_FIXTURE_URL, init)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load local simulation fixture (${response.status})`,
          );
        }
        return response.json() as Promise<SimulationResult>;
      })
      .catch((error: unknown) => {
        localStandardRunFixturePromise = null;
        throw error;
      });
  }

  return localStandardRunFixturePromise;
}

function createBrowserFixtureLoader(): LocalSimulationLoader {
  return async (options) => loadLocalStandardRunFixture(options?.signal);
}

function createLocalSimulationProvider(
  modelData: ModelDataPayload,
): SimulationProviderApi {
  const localCore = createLocalSimulationCore(
    modelData,
    createBrowserFixtureLoader(),
  );
  return {
    mode: "local",
    simulatePreset: localCore.simulatePreset,
    simulate: localCore.simulate,
    compare: localCore.compare,
  };
}

function resolveProviderMode(): ProviderMode {
  return window.__PYWORLD3_PROVIDER_MODE__ === "local" ? "local" : "http";
}

export function createSimulationProvider(
  modelData: ModelDataPayload,
): SimulationProviderApi {
  return resolveProviderMode() === "local"
    ? createLocalSimulationProvider(modelData)
    : HttpSimulationProvider;
}

export const SimulationProvider =
  resolveProviderMode() === "local"
    ? null
    : HttpSimulationProvider;
