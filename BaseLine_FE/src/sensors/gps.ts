import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { log } from "../utils/logger";

const BG_TASK = "BG_LOCATION_TASK";
const KEY_LAST_BG_LOC = "sensor:lastBgLocation";

type GpsSample = {
  ts: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
};

function toSample(coords: Location.LocationObjectCoords): GpsSample {
  return {
    ts: new Date().toISOString(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? null,
    altitude: coords.altitude ?? null,
    speed: coords.speed ?? null,
    heading: coords.heading ?? null,
  };
}

// --- Background task registration --------------------
if (!TaskManager.isTaskDefined(BG_TASK)) {
  TaskManager.defineTask(BG_TASK, async ({ data, error }) => {
    if (error) {
      log("[GPS] bg task error", error);
      return;
    }

    const locations = (data as { locations?: Location.LocationObject[] } | null)
      ?.locations;
    const loc = locations?.[locations.length - 1];

    if (!loc) return;

    const sample = toSample(loc.coords);

    try {
      await AsyncStorage.setItem(KEY_LAST_BG_LOC, JSON.stringify(sample));
      log("[GPS] bg sample saved", {
        accuracy: sample.accuracy,
        latitude: sample.latitude,
        longitude: sample.longitude,
      });
    } catch (e) {
      log("[GPS] bg sample save failed", e);
    }
  });
}

// --- Permission helpers --------------------
export async function ensureLocationPermissionsBackground() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    log("[GPS] foreground permission denied");
    return false;
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  const ok = bg.status === "granted";

  if (!ok) {
    log("[GPS] background permission denied");
  }

  return ok;
}

// --- Background location control --------------------
export async function startBackgroundLocation() {
  const servicesEnabled = await Location.hasServicesEnabledAsync();

  if (!servicesEnabled) {
    log("[GPS] location services off");
    return;
  }

  const started = await Location.hasStartedLocationUpdatesAsync(BG_TASK);
  if (started) return;

  const perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== "granted") {
    log("[GPS] cannot start bg location: foreground permission missing");
    return;
  }

  await Location.startLocationUpdatesAsync(BG_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30 * 1000,
    distanceInterval: 10,
    deferredUpdatesInterval: 60 * 1000,
    deferredUpdatesDistance: 25,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    ...(Platform.OS === "android"
      ? {
          foregroundService: {
            notificationTitle: "Baseline tracking",
            notificationBody: "Collecting location in the background",
          },
        }
      : {}),
  });

  log("[GPS] background location started");
}

export async function stopBackgroundLocation() {
  const started = await Location.hasStartedLocationUpdatesAsync(BG_TASK);
  if (!started) return;

  await Location.stopLocationUpdatesAsync(BG_TASK);
  log("[GPS] background location stopped");
}

// --- Stored sample helpers --------------------
export async function getLastBackgroundLocationSample(): Promise<GpsSample | null> {
  const raw = await AsyncStorage.getItem(KEY_LAST_BG_LOC);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GpsSample;
  } catch {
    return null;
  }
}

// --- Foreground GPS helpers --------------------
export async function getForegroundLocationSampleOnce(): Promise<GpsSample | null> {
  const perm = await Location.getForegroundPermissionsAsync();

  if (perm.status !== "granted") {
    log("[GPS] foreground sample skipped: permission not granted");
    return null;
  }

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true,
    });

    return toSample(pos.coords);
  } catch (e) {
    log("[GPS] foreground sample failed", e);
    return null;
  }
}

// --- Debug helper for emulator GPS --------------------
export async function startForegroundGpsWatchDebug(
  onFix?: (sample: GpsSample) => void,
) {
  const perm = await Location.getForegroundPermissionsAsync();

  if (perm.status !== "granted") {
    log("[GPS debug] watch skipped: permission not granted");
    return () => {};
  }

  log("[GPS debug] watch started");

  let stopped = false;
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 0,
    },
    (pos) => {
      const sample = toSample(pos.coords);

      log("[GPS debug] fix", {
        accuracy: sample.accuracy,
        latitude: sample.latitude,
        longitude: sample.longitude,
      });

      onFix?.(sample);

      if (!stopped) {
        stopped = true;
        sub.remove();
        log("[GPS debug] watch stopped");
      }
    },
  );

  return () => {
    if (!stopped) {
      stopped = true;
      sub.remove();
      log("[GPS debug] watch stopped");
    }
  };
}
