import type { HomeServerData, WeekIndex } from "./home.types";

// --- Helpers --------------------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Constants --------------------
const TODAY = new Date().getDay() as WeekIndex;

// --- Mock API --------------------
export async function fetchHomeServerData(): Promise<HomeServerData> {
  await sleep(200);

  return {
    name: "Yuval",
    birthDate: null,
    nextCheckin: "8:00 PM",
    streak: {
      totalDays: TODAY + 1,
      encouragement: "your week",
      todayIndex: TODAY,
      completedWeek: Array.from({ length: 7 }, (_, i) => i < TODAY),
    },
    contacts: [
      {
        id: "clinician",
        title: "Clinician",
        ctaLabel: "Contact",
        phone: "+15551234567",
      },
      {
        id: "caregiver",
        title: "Caregiver",
        ctaLabel: "Contact",
        phone: "+15557654321",
      },
    ],
    patterns: {
      text: `Your sleep varied this week.
Try keeping a consistent bedtime and check in again tomorrow.`,
    },
  };
}
