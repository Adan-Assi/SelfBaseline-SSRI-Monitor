import { create } from "zustand";
import { toISODateLocal } from "../../utils/date";

export type GoalOption =
  | "Tune into my emotions"
  | "Stress less"
  | "Strengthen my emotions"
  | "Sleep soundly"
  | "Be more at ease socially"
  | "Something else";

type OnboardingState = {
  name: string;
  email: string;
  password: string;
  birthDate: Date | null;
  goal: GoalOption | null;
  checkinTime: Date | null;
  lastCheckInISO: string | null; // YYYY-MM-DD of the last completed check-in

  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setBirthDate: (date: Date) => void;
  setGoal: (goal: GoalOption) => void;

  setCheckinTime: (time: Date) => void;
  skipCheckinTime: () => void;

  markCheckedInToday: () => void;

  reset: () => void;
};

// --- Onboarding state --------------------
// Stores user info collected during onboarding
export const useOnboardingStore = create<OnboardingState>((set) => ({
  name: "",
  email: "",
  password: "",
  birthDate: null,
  goal: null,
  checkinTime: null,
  lastCheckInISO: null,

  setName: (name) => set({ name }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setBirthDate: (birthDate) => set({ birthDate }),
  setGoal: (goal) => set({ goal }),

  setCheckinTime: (checkinTime) => set({ checkinTime }),

  skipCheckinTime: () => set({ checkinTime: null }),

  markCheckedInToday: () => set({ lastCheckInISO: toISODateLocal(new Date()) }),

  reset: () =>
    set({
      name: "",
      email: "",
      password: "",
      birthDate: null,
      goal: null,
      checkinTime: null,
      lastCheckInISO: null,
    }),
}));
