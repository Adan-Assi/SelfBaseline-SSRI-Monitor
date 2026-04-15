import {
  getAppSessionsInWindow,
  pruneAppSessions,
  smoothAppSessions,
} from "./appSessions";
import { collectGpsSample } from "./collectors/gps.collector";
import {
  buildWifiLocation,
  collectWifiScan,
} from "./collectors/wifi.collector";
import { collectPhoneCharge } from "./phoneCharge";
import type { SensorBatch } from "./sensorTypes";

import { logSensorErr } from "../utils/logger";

// --- Sensor batch collection --------------------
export async function collectSafeSensors(
  windowStart: Date,
  windowEnd: Date,
): Promise<SensorBatch> {
  const nowIso = new Date().toISOString();

  const [gps, phoneChargeRes, sessions, wifiRaw] = await Promise.all([
    collectGpsSample().catch((e) => {
      logSensorErr("gps", e);
      return null;
    }),
    collectPhoneCharge().catch((e) => {
      logSensorErr("phoneCharge", e);
      return null;
    }),
    getAppSessionsInWindow(windowStart, windowEnd).catch((e) => {
      logSensorErr("appSessions", e);
      return [];
    }),
    collectWifiScan(),
  ]);

  await pruneAppSessions(7).catch((e) => {
    logSensorErr("pruneAppSessions", e);
  });

  const cleanSessions = smoothAppSessions(sessions, 2000);

  const wifi =
    wifiRaw.length > 0
      ? wifiRaw.map((w) => ({
          ts: nowIso,
          bssid: w.bssid,
          frequency: w.frequency ?? null,
          signal_level: w.signal_level,
        }))
      : undefined;

  const wifi_location =
    wifi && gps
      ? await buildWifiLocation(wifi, {
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
        })
      : undefined;

  return {
    deviceTime: nowIso,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    sensors: {
      gps: gps ? [gps] : undefined,
      phonecharge: phoneChargeRes?.snapshot ?? undefined,
      phonecharge_period: phoneChargeRes?.periodEvent ?? undefined,
      app_sessions: cleanSessions.length ? cleanSessions : undefined,
      wifi,
      wifi_location,
    },
  };
}
