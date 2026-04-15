import { useAuthStore } from "../features/auth/auth.store";
import { DATA_MODE, type DataMode } from "./runtime";

// --- Types --------------------
export type RuntimePolicy = {
  mode: DataMode;
  useBackend: boolean;
  allowFallback: boolean;
};

// --- Builders --------------------
function buildRuntimePolicy(mode: DataMode): RuntimePolicy {
  return {
    mode,
    useBackend: mode !== "mock",
    allowFallback: mode === "partial",
  };
}

// --- Getters --------------------
export function getEffectiveMode(): DataMode {
  const override = useAuthStore.getState().overrideMode;
  return override ?? DATA_MODE;
}

export function getRuntimePolicy(): RuntimePolicy {
  return buildRuntimePolicy(getEffectiveMode());
}

export function useRuntimePolicy(): RuntimePolicy {
  const overrideMode = useAuthStore((s) => s.overrideMode);
  const mode = overrideMode ?? DATA_MODE;

  return buildRuntimePolicy(mode);
}

// --- Guards --------------------
export function hasUsableBackendUserId(userId: number | null | undefined) {
  return typeof userId === "number" && Number.isFinite(userId) && userId > 0;
}
