import Constants from "expo-constants";

export type DataMode = "real" | "partial" | "mock";

function readExtra<T = any>(key: string): T | undefined {
  return (Constants.expoConfig?.extra as any)?.[key] as T | undefined;
}

// --- Data mode configuration --------------------
// Controls where data comes from in the app:
//   real     → full backend
//   partial  → backend preferred + local fallbacks when needed
//   mock     → fully mocked data, no backend calls
export const DATA_MODE: DataMode = (() => {
  const raw = String(readExtra("dataMode") ?? "real").toLowerCase();

  if (raw === "mock" || raw === "partial" || raw === "real") {
    return raw;
  }

  return "real";
})();

export const DEBUG_LOGS: boolean = Boolean(readExtra("debugLogs"));

// --- Backend API configuration --------------------
export const API_BASE_URL: string = String(
  readExtra("apiBaseUrl") ??
    "https://mental-health-api-92209979855.us-east1.run.app",
).replace(/\/+$|\s+/g, "");

// --- Backend WebSocket configuration --------------------
export const WS_BASE_URL: string = String(
  readExtra("wsBaseUrl") ??
    API_BASE_URL.replace(/^http:\/\//, "ws://").replace(
      /^https:\/\//,
      "wss://",
    ),
).replace(/\/+$|\s+/g, "");
