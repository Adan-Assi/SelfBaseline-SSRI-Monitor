import { formatNextCheckinLabel, toISODateLocal } from "../../utils/date";
import type { HomeServerData, WeekIndex } from "./home.types";

// --- Date helpers --------------------
export function toWeekIndex(d: Date): WeekIndex {
  return d.getDay() as WeekIndex;
}

// --- Value helpers --------------------
export function normalizePhone(phone: string | null | undefined) {
  return phone ? String(phone).trim() : "";
}

// --- Streak builders --------------------
export function buildCompletedWeek(
  todayIndex: WeekIndex,
  lastCheckInISO?: string | null,
): boolean[] {
  const week = Array.from({ length: 7 }, (_, i) => i < todayIndex);
  const todayISO = toISODateLocal(new Date());

  if (lastCheckInISO === todayISO) {
    week[todayIndex] = true;
  }

  return week;
}

export function patchMockHome(
  data: HomeServerData,
  lastCheckInISO?: string | null,
): HomeServerData {
  const todayIndex = toWeekIndex(new Date());

  return {
    ...data,
    streak: {
      ...data.streak,
      todayIndex,
      completedWeek: buildCompletedWeek(todayIndex, lastCheckInISO),
    },
  };
}

// --- Home data builders --------------------
export function buildHomeServerData(params: {
  streakCount: number | null | undefined;
  doctor?: { name?: string | null; phone?: string | null } | null;
  caregiver?: { name?: string | null; phone?: string | null } | null;
  lastCheckInISO?: string | null;
}): HomeServerData {
  const { streakCount, doctor, caregiver, lastCheckInISO } = params;

  const contacts: HomeServerData["contacts"] = [];

  const doctorPhone = normalizePhone(doctor?.phone);
  if (doctor?.name && doctorPhone) {
    contacts.push({
      id: "doctor",
      title: "doctor",
      phone: doctorPhone,
      ctaLabel: "call now",
    });
  }

  const caregiverPhone = normalizePhone(caregiver?.phone);
  if (caregiver?.name && caregiverPhone) {
    contacts.push({
      id: "caregiver",
      title: "caregiver",
      phone: caregiverPhone,
      ctaLabel: "call now",
    });
  }

  const todayIndex = toWeekIndex(new Date());

  return {
    contacts,
    streak: {
      totalDays: streakCount ?? 0,
      encouragement:
        (streakCount ?? 0) > 0 ? "Keep going" : "Let’s start your streak",
      todayIndex,
      completedWeek: buildCompletedWeek(todayIndex, lastCheckInISO),
    },
    patterns: {
      text: "No insights yet. After a few check-ins, you’ll see patterns here.",
    },
  };
}

export function buildNextCheckInLabel(params: {
  beNextCheckin: string | null;
  checkinTime: Date | null;
  lastCheckInISO?: string | null;
  useBackend: boolean;
}): string {
  const { beNextCheckin, checkinTime, lastCheckInISO, useBackend } = params;

  const todayISO = toISODateLocal(new Date());
  const doneToday = lastCheckInISO === todayISO;
  const dayWord = doneToday ? "Tomorrow" : "Today";

  if (useBackend && beNextCheckin) {
    return `${dayWord}, ${formatNextCheckinLabel(beNextCheckin)}`;
  }

  if (!checkinTime) return dayWord;
  return `${dayWord}, ${formatNextCheckinLabel(checkinTime)}`;
}

export function pickHomeName(params: {
  beName: string;
  onboardingName: string;
  useBackend: boolean;
}): string {
  const { beName, onboardingName, useBackend } = params;
  const n = useBackend ? beName || onboardingName : onboardingName;
  return n?.trim() ? n.trim() : "";
}
