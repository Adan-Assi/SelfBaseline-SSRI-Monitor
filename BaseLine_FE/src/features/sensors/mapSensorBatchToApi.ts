import type { SensorBatch } from "../../sensors/sensorTypes";

import type {
  SensorReadingApi,
  UploadSensorBatchRequest,
} from "./sensorsApi.types";

//--- Numeric fallback helper --------------------
function n(v: number | null | undefined, fallback = 0) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

//--- Maps local collected sensor batch -> backend upload payload --------------------
export function mapSensorBatchToApi(
  batch: SensorBatch,
  userId: number,
): UploadSensorBatchRequest {
  const sensors: SensorReadingApi[] = [];

  // --- GPS samples --------------------
  for (const gps of batch.sensors.gps ?? []) {
    sensors.push({
      type: "gps",
      ts: gps.ts,
      latitude: gps.latitude,
      longitude: gps.longitude,
      accuracy: n(gps.accuracy),
      altitude: n(gps.altitude),
      speed: n(gps.speed),
      heading: n(gps.heading),
      source: "device",
      window_start: batch.windowStart,
      window_end: batch.windowEnd,
    });
  }

  // --- Wi-Fi scan samples --------------------
  for (const wifi of batch.sensors.wifi ?? []) {
    sensors.push({
      type: "wifi",
      ts: wifi.ts,
      bssid: wifi.bssid,
      frequency: n(wifi.frequency),
      signalLevel: n(wifi.signal_level),
    });
  }

  // --- Wi-Fi derived location --------------------
  const wifiLocation = batch.sensors.wifi_location;
  if (wifiLocation) {
    sensors.push({
      type: "wifi_location",
      ts: wifiLocation.ts,
      latitude: n(wifiLocation.latitude),
      longitude: n(wifiLocation.longitude),
      accuracy: n(wifiLocation.accuracy),
      source: wifiLocation.source,
    });
  }

  // --- Battery / charge snapshot --------------------
  const charge = batch.sensors.phonecharge;
  if (charge) {
    sensors.push({
      type: "phonecharge",
      ts: charge.ts,
      battery_level: n(charge.batteryLevel),
      is_charging:
        charge.batteryState === "charging" || charge.batteryState === "full",
      power_save: charge.powerMode === "lowPower",
      power_source:
        charge.batteryState === "charging" || charge.batteryState === "full"
          ? "battery"
          : "unplugged",
    });
  }

  // --- Battery / charge period --------------------
  const chargePeriod = batch.sensors.phonecharge_period;
  if (chargePeriod?.end) {
    sensors.push({
      type: "phonecharge_period",
      start_ts: chargePeriod.start,
      end_ts: chargePeriod.end,
      state: chargePeriod.state,
      start_level: n(chargePeriod.startLevel),
      end_level: n(chargePeriod.endLevel),
    });
  }

  // --- App sessions --------------------
  for (const session of batch.sensors.app_sessions ?? []) {
    sensors.push({
      type: "app_sessions",
      start_ts: session.start,
      end_ts: session.end,
      state: session.state,
    });
  }

  // --- Final backend request --------------------
  return {
    userId,
    deviceTime: batch.deviceTime,
    sensors,
  };
}
