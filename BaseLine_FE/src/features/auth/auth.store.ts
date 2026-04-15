import { create } from "zustand";

import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from "./auth.storage";

export type RuntimeOverride = "mock" | "partial" | "real" | null;

type LoginPayload = {
  userId: number | null;
  username: string | null;
  displayName: string | null;
  role: string | null;
};

type AuthState = {
  userId: number | null;
  username: string | null;
  displayName: string | null;
  role: string | null;

  overrideMode: RuntimeOverride;
  isHydrated: boolean;

  setUserId: (id: number | null) => void;
  setOverrideMode: (mode: RuntimeOverride) => void;

  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;

  clear: () => void;
};

// --- Global auth state --------------------
export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  username: null,
  displayName: null,
  role: null,

  overrideMode: null,
  isHydrated: false,

  // --- Setters --------------------
  setUserId: (id) => set({ userId: id }),

  setOverrideMode: (mode) => set({ overrideMode: mode }),

  // --- Login + persist session --------------------
  login: async ({ userId, username, displayName, role }) => {
    set((state) => ({
      userId,
      username,
      displayName,
      role,
      overrideMode: state.overrideMode,
      isHydrated: true,
    }));

    await saveAuthSession({
      userId,
      username,
      displayName,
      role,
    });
  },

  // --- Logout + clear persisted session --------------------
  logout: async () => {
    const overrideMode = get().overrideMode;

    set({
      userId: null,
      username: null,
      displayName: null,
      role: null,
      overrideMode,
      isHydrated: true,
    });

    await clearAuthSession();
  },

  // --- Restore persisted session on app startup --------------------
  hydrate: async () => {
    try {
      const session = await loadAuthSession();

      set((state) => {
        if (state.userId) {
          return { isHydrated: true };
        }

        if (!session) {
          return { isHydrated: true };
        }

        return {
          userId: session.userId,
          username: session.username,
          displayName: session.displayName,
          role: session.role,
          overrideMode: state.overrideMode,
          isHydrated: true,
        };
      });
    } catch {
      set({ isHydrated: true });
    }
  },

  // --- Clear in-memory auth state --------------------
  clear: () =>
    set((state) => ({
      userId: null,
      username: null,
      displayName: null,
      role: null,
      overrideMode: state.overrideMode,
      isHydrated: true,
    })),
}));
