import { Stack, router, usePathname, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, LogBox, type AppStateStatus } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { log } from "@/src/utils/logger";
import {
  registerSafeUploader,
  trySafeUploadIfDue,
} from "../src/background/twiceDailySafeUpload";
import { useAuthStore } from "../src/features/auth/auth.store";
import { startAppSessionTracking } from "../src/sensors/appSessions";
import {
  ensureLocationPermissionsBackground,
  startBackgroundLocation,
} from "../src/sensors/gps";
import { isExpoGo } from "../src/sensors/runtime";

LogBox.ignoreLogs(["Unable to activate keep awake"]);

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const userId = useAuthStore((s) => s.userId);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const segments = useSegments();
  const pathname = usePathname();

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastResumeCheckRef = useRef(0);
  const bootAtRef = useRef(Date.now());

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inCheckinGroup = segments[0] === "(checkin)";
    const isWelcome = pathname === "/welcome";
    const isLogin = pathname === "/login";

    if (!userId && !inAuthGroup && !inCheckinGroup) {
      router.replace("/(auth)/welcome");
      return;
    }

    if (userId && (isWelcome || isLogin)) {
      router.replace("/(main)/home");
    }
  }, [userId, isHydrated, segments, pathname]);

  useEffect(() => {
    const stopTracking = startAppSessionTracking();
    return () => {
      stopTracking?.();
    };
  }, []);

  useEffect(() => {
    if (isExpoGo()) {
      log("[Startup] Expo Go -> native services skipped");
      return;
    }

    void (async () => {
      try {
        const ok = await ensureLocationPermissionsBackground();

        if (ok) {
          await startBackgroundLocation();
        }

        log("[Startup] location ready", { ok });

        await registerSafeUploader();
        log("[Startup] safe uploader ready");
      } catch (e) {
        log("[Startup] native startup error", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (isExpoGo()) return;
    if (!isHydrated) return;
    if (userId === null) return;

    void trySafeUploadIfDue("fg");
  }, [isHydrated, userId]);

  useEffect(() => {
    if (isExpoGo()) return;

    const sub = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      const becameActive =
        (prevState === "background" || prevState === "inactive") &&
        nextState === "active";

      if (!becameActive) return;
      if (!isHydrated) return;
      if (userId === null) return;

      const now = Date.now();

      if (now - bootAtRef.current < 3000) return;
      if (now - lastResumeCheckRef.current < 2500) return;

      lastResumeCheckRef.current = now;

      log("[safeUpload] app resumed -> recheck");
      void trySafeUploadIfDue("fg");
    });

    return () => {
      sub.remove();
    };
  }, [isHydrated, userId]);

  useEffect(() => {
    if (isExpoGo()) {
      log("[safeUpload] scheduler skipped in Expo Go");
      return;
    }

    if (!isHydrated || userId === null) return;

    log("[safeUpload] scheduler started");

    const id = setInterval(
      () => {
        void trySafeUploadIfDue("fg");
      },
      20 * 60 * 1000,
    );

    return () => {
      clearInterval(id);
      log("[safeUpload] scheduler stopped");
    };
  }, [isHydrated, userId]);

  if (!isHydrated) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
