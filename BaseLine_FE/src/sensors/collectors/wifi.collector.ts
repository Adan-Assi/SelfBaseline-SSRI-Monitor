import { log, logSensorErr } from "../../utils/logger";
import { canUseNativeAndroidSensors } from "../runtime";

export async function collectWifiScan() {
  if (!canUseNativeAndroidSensors()) {
    log("[Sensors] wifiScan skipped");
    return [];
  }

  try {
    const mod = await import("../wifiScan");
    return await mod.scanNearbyWifi();
  } catch (e) {
    logSensorErr("wifiScan", e);
    return [];
  }
}

export async function buildWifiLocation(
  wifi: any[],
  deviceLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null,
) {
  if (!wifi.length) return undefined;
  if (!deviceLocation) return undefined;

  try {
    const mod = await import("../wifiLocation");
    return mod.buildWifiLocationFromScan(wifi, deviceLocation);
  } catch (e) {
    logSensorErr("wifiLocation", e);
    return undefined;
  }
}
