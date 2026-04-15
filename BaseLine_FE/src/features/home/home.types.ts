export const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type WeekIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Contact = {
  id: string;
  title: string;
  ctaLabel: string;
  phone?: string;
};

export type StreakData = {
  totalDays: number;
  encouragement: string;
  todayIndex: WeekIndex; // 0=Sun .. 6=Sat
  completedWeek: boolean[];
};

export type PatternsPreview = {
  text: string;
};

export type HomeServerResponse = {
  full_name: string;
  birth_date: string | null;
  streak_count: number;
  next_checkin: string | null;
};

export type HomeServerData = {
  name?: string;
  birthDate?: string | null;
  nextCheckin?: string | null;
  streak: StreakData;
  contacts: Contact[];
  patterns: PatternsPreview;
};
