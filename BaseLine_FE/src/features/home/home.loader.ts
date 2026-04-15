import {
  fetchInsights,
  fetchPatientDashboard,
  fetchProviderLink,
} from "./home.api";
import { fetchHomeServerData } from "./home.api.mock";
import { buildHomeServerData, patchMockHome } from "./home.mapper";
import type { HomeServerData } from "./home.types";

// --- Types --------------------
export type LoadedHomeState = {
  server: HomeServerData | null;
  beName: string;
  beNextCheckin: string | null;
};

// --- Mock loader --------------------
export async function loadMockHome(params: {
  lastCheckInISO?: string | null;
}): Promise<LoadedHomeState> {
  const data = await fetchHomeServerData();

  return {
    server: patchMockHome(data, params.lastCheckInISO),
    beName: "",
    beNextCheckin: null,
  };
}

// --- Real loader --------------------
export async function loadRealHome(params: {
  backendUserId: number;
  lastCheckInISO?: string | null;
}): Promise<LoadedHomeState> {
  const { backendUserId, lastCheckInISO } = params;

  const [dash, link] = await Promise.all([
    fetchPatientDashboard(backendUserId),
    fetchProviderLink(backendUserId),
  ]);

  let server = buildHomeServerData({
    streakCount: dash.streak_count,
    doctor: link.doctor,
    caregiver: link.caregiver,
    lastCheckInISO,
  });

  try {
    const insights = await fetchInsights(backendUserId);
    const insightsText = insights?.insights?.length
      ? insights.insights.slice(0, 2).join("\n")
      : "";

    if (insightsText) {
      server = {
        ...server,
        patterns: {
          text: insightsText,
        },
      };
    }
  } catch {}

  return {
    server,
    beName: dash.full_name || "",
    beNextCheckin: dash.next_checkin ?? null,
  };
}
