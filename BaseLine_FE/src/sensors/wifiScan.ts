import { PermissionsAndroid, Platform } from "react-native";
import { log } from "../utils/logger";
import { canUseNativeAndroidSensors } from "./runtime";
export type NearbyWifi = {
  bssid: string;
  frequency: number | null;
  signal_level: number;
};

// --- Permission helpers --------------------
async function requestAndroidWifiScanPermissions(): Promise<boolean> {
  if (Platform.OS !== "android" || !canUseNativeAndroidSensors()) {
    return false;
  }

  const permissions = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  if (PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES) {
    permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);

  return Object.values(result).every(
    (r) => r === PermissionsAndroid.RESULTS.GRANTED,
  );
}

// --- Wifi scan --------------------
export async function scanNearbyWifi(): Promise<NearbyWifi[]> {
  if (!canUseNativeAndroidSensors()) {
    log("[wifiScan] skipped: unsupported in Expo Go / non-Android");
    return [];
  }

  const ok = await requestAndroidWifiScanPermissions();
  if (!ok) return [];

  try {
    const WifiManagerModule = await import("react-native-wifi-reborn");
    const WifiManager = WifiManagerModule.default;

    const rawList = await WifiManager.loadWifiList();
    if (!Array.isArray(rawList)) return [];

    return rawList
      .map((n: any) => {
        const bssid = n.BSSID ?? n.bssid ?? "";
        if (!bssid) return null;

        const frequency =
          typeof n.frequency === "number"
            ? n.frequency
            : typeof n.frequency === "string"
              ? Number(n.frequency)
              : null;

        const signal_level =
          typeof n.level === "number"
            ? n.level
            : typeof n.level === "string"
              ? Number(n.level)
              : NaN;

        if (!Number.isFinite(signal_level)) return null;

        return {
          bssid,
          frequency,
          signal_level,
        };
      })
      .filter(Boolean) as NearbyWifi[];
  } catch (e) {
    log("[wifiScan] failed:", e);
    return [];
  }
}
