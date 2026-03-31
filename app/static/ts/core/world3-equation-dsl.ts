import type {
  World3AuxiliaryKey,
  World3ConstantKey,
  World3FlowKey,
  World3StockKey,
  World3VariableKey,
} from "./world3-keys.js";
import type {
  World3SimulationBuffers,
  World3SimulationConstants,
  World3SimulationLookups,
} from "./world3-simulation-sectors.js";

export type World3EquationDependency = World3VariableKey | World3ConstantKey;
export type World3DerivedEquationKey = World3AuxiliaryKey | World3FlowKey;
export type World3RuntimeValueKey =
  | "ehspc"
  | "diopc"
  | "ple"
  | "fcfpc"
  | "alai"
  | "ai"
  | "pfr"
  | "ppgf"
  | "pptd"
  | "ppapr";

export type World3StockEquationContext = {
  k: number;
  dt: number;
  buffers: World3SimulationBuffers;
  constants: World3SimulationConstants;
};

export type World3StateStockEquation<K extends World3StockKey = World3StockKey> = {
  kind: "state-stock";
  key: K;
  initialConstant: World3ConstantKey;
  inputs: readonly World3EquationDependency[];
  next: (context: World3StockEquationContext) => number;
};

export type World3DerivedStockEquation<K extends World3StockKey = World3StockKey> = {
  kind: "derived-stock";
  key: K;
  inputs: readonly World3VariableKey[];
  compute: (context: World3StockEquationContext) => number;
};

export type World3DerivedEquationContext = World3StockEquationContext & {
  t: number;
  policyYear: number;
  lookups: World3SimulationLookups;
  runtime?: Partial<Record<World3RuntimeValueKey, number>>;
};

export function requireWorld3RuntimeValue(
  context: World3DerivedEquationContext,
  key: World3RuntimeValueKey,
): number {
  const value = context.runtime?.[key];
  if (value === undefined) {
    throw new Error(`Missing runtime value '${key}' for derived equation`);
  }
  return value;
}

export type World3DerivedEquation<K extends World3DerivedEquationKey = World3DerivedEquationKey> =
  {
    kind: "derived-equation";
    key: K;
    inputs: readonly World3EquationDependency[];
    compute: (context: World3DerivedEquationContext) => number;
  };

export function defineStateStock<K extends World3StockKey>(
  definition: Omit<World3StateStockEquation<K>, "kind">,
): World3StateStockEquation<K> {
  return {
    kind: "state-stock",
    ...definition,
  };
}

export function defineDerivedStock<K extends World3StockKey>(
  definition: Omit<World3DerivedStockEquation<K>, "kind">,
): World3DerivedStockEquation<K> {
  return {
    kind: "derived-stock",
    ...definition,
  };
}

export function defineDerivedEquation<K extends World3DerivedEquationKey>(
  definition: Omit<World3DerivedEquation<K>, "kind">,
): World3DerivedEquation<K> {
  return {
    kind: "derived-equation",
    ...definition,
  };
}
