import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "../../features/auth/auth.store";
import { useOnboardingStore } from "../../features/onboarding/onboarding.store";

import {
  hasUsableBackendUserId,
  useRuntimePolicy,
} from "../../config/runtimePolicy";
import { loadMockHome, loadRealHome } from "../../features/home/home.loader";
import {
  buildNextCheckInLabel,
  pickHomeName,
} from "../../features/home/home.mapper";
import type { HomeServerData } from "../../features/home/home.types";

export type HomeViewModel = {
  name: string;
  nextCheckInLabel: string;
  isTodayCheckInDone: boolean;
  server: HomeServerData | null;
  loading: boolean;
};

// --- Date helpers --------------------
function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function useHomeData(): HomeViewModel {
  // --- Store state --------------------
  const userId = useAuthStore((s) => s.userId);

  const onboardingName = useOnboardingStore((s) => s.name);
  const checkinTime = useOnboardingStore((s) => s.checkinTime);
  const lastCheckInISO = useOnboardingStore((s) => s.lastCheckInISO);

  // --- Local state --------------------
  const [server, setServer] = useState<HomeServerData | null>(null);
  const [loading, setLoading] = useState(true);

  const [beName, setBeName] = useState("");
  const [beNextCheckin, setBeNextCheckin] = useState<string | null>(null);

  // --- Runtime policy --------------------
  const policy = useRuntimePolicy();

  // --- Home loading --------------------
  useEffect(() => {
    let alive = true;

    async function applyMockHome() {
      const data = await loadMockHome({});
      if (!alive) return;

      setServer(data.server);
      setBeName(data.beName);
      setBeNextCheckin(data.beNextCheckin);
    }

    async function applyRealHome(backendUserId: number) {
      const data = await loadRealHome({
        backendUserId,
      });
      if (!alive) return;

      setServer(data.server);
      setBeName(data.beName);
      setBeNextCheckin(data.beNextCheckin);
    }

    async function load() {
      setLoading(true);

      try {
        if (!policy.useBackend) {
          await applyMockHome();
          return;
        }

        if (!hasUsableBackendUserId(userId)) {
          if (policy.allowFallback) {
            await applyMockHome();
            return;
          }

          if (alive) {
            setServer(null);
            setBeName("");
            setBeNextCheckin(null);
          }
          return;
        }

        try {
          await applyRealHome(userId as number);
        } catch (error) {
          if (policy.allowFallback) {
            await applyMockHome();
            return;
          }

          if (alive) {
            setServer(null);
            setBeName("");
            setBeNextCheckin(null);
          }

          throw error;
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [userId, policy.mode, policy.useBackend, policy.allowFallback]);

  // --- Derived home values --------------------
  const nextCheckInLabel = useMemo(() => {
    return buildNextCheckInLabel({
      beNextCheckin,
      checkinTime,
      lastCheckInISO,
      useBackend: policy.useBackend,
    });
  }, [beNextCheckin, checkinTime, lastCheckInISO, policy.useBackend]);

  const isTodayCheckInDone = useMemo(() => {
    if (!lastCheckInISO) return false;

    const last = new Date(lastCheckInISO);
    if (Number.isNaN(last.getTime())) return false;

    return isSameLocalDay(last, new Date());
  }, [lastCheckInISO]);

  const name = useMemo(() => {
    return pickHomeName({
      beName,
      onboardingName,
      useBackend: policy.useBackend,
    });
  }, [beName, onboardingName, policy.useBackend]);

  return {
    name,
    nextCheckInLabel,
    isTodayCheckInDone,
    server,
    loading,
  };
}
