import { useMemo, useState } from "react";

import { uploadCollectedSensorBatch } from "../../features/sensors/sensorUpload";
import { collectSafeSensors } from "../../sensors/collectSafeSensors";
import { logSensorBatch } from "../../sensors/debugSensors";
import { canUseNativeAndroidSensors } from "../../sensors/runtime";
import type { SensorBatch } from "../../sensors/sensorTypes";
import { fmt } from "../../utils/format";
import { log } from "../../utils/logger";

export function useSensorDebug() {
  // --- Local state --------------------
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  const [batch, setBatch] = useState<SensorBatch | null>(null);
  const [wifiScan, setWifiScanState] = useState<
    { bssid: string; frequency: number | null; signal_level: number }[]
  >([]);
  const [wifiLabel, setWifiLabel] = useState<{
    ts: string;
    label: string;
    confidence: number;
    matched?: { bssid: string; signal_level: number }[];
  } | null>(null);

  // --- Handlers --------------------
  const runSensorDebug = async () => {
    setDebugOpen(true);
    setDebugLoading(true);
    setDebugError(null);

    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
      const windowEnd = now;

      log("[SensorsDebug] run started", {
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
      });

      const b = await collectSafeSensors(windowStart, windowEnd);
      setBatch(b);
      logSensorBatch(b);

      log("[SensorsDebug] batch collected", {
        gps: b.sensors.gps?.length ?? 0,
        wifi: b.sensors.wifi?.length ?? 0,
        wifiLocation: !!b.sensors.wifi_location,
        phoneCharge: !!b.sensors.phonecharge,
        phoneChargePeriod: !!b.sensors.phonecharge_period,
        appSessions: b.sensors.app_sessions?.length ?? 0,
      });

      try {
        const uploadResult = await uploadCollectedSensorBatch(b);

        if (uploadResult.skipped) {
          log("[SensorsDebug] upload skipped", {
            reason: uploadResult.reason,
          });
        } else {
          log("[SensorsDebug] upload success", uploadResult.response);
        }
      } catch (uploadErr) {
        log("[SensorsDebug] upload failed", uploadErr);
      }

      if (canUseNativeAndroidSensors()) {
        const wifiMod = await import("../../sensors/wifiScan");
        const wifi = await wifiMod.scanNearbyWifi();

        setWifiScanState(wifi);

        log("[SensorsDebug] wifi scan", {
          networks: wifi.length,
        });
      } else {
        setWifiScanState([]);
        setWifiLabel(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setDebugError(msg);
      log("[SensorsDebug] failed", e);
    } finally {
      setDebugLoading(false);
    }
  };

  const hideDebug = () => {
    setDebugOpen(false);
  };

  // --- Derived values --------------------
  const gpsLine = useMemo(() => {
    const g0 = batch?.sensors?.gps?.[0];
    if (!g0) return "-";
    return `${fmt(g0.latitude)}, ${fmt(g0.longitude)} (acc ${g0.accuracy ?? "-"})`;
  }, [batch]);

  const chargeLine = useMemo(() => {
    const c = batch?.sensors?.phonecharge;
    if (!c) return "-";
    const pct =
      c.batteryLevel === null || c.batteryLevel === undefined
        ? "-"
        : `${Math.round(c.batteryLevel * 100)}%`;
    return `${pct} • ${c.batteryState}`;
  }, [batch]);

  const sessionsLine = useMemo(() => {
    const n = batch?.sensors?.app_sessions?.length ?? 0;
    return `${n} session(s)`;
  }, [batch]);

  const wifiLine = useMemo(() => {
    if (!wifiScan.length) return "0 networks";
    return `${wifiScan.length} networks`;
  }, [wifiScan]);

  const wifiLocLine = useMemo(() => {
    if (!wifiLabel) return "-";
    return `${wifiLabel.label} (${Math.round(wifiLabel.confidence * 100)}%)`;
  }, [wifiLabel]);

  return {
    debugOpen,
    debugLoading,
    debugError,
    runSensorDebug,
    hideDebug,
    gpsLine,
    chargeLine,
    sessionsLine,
    wifiLine,
    wifiLocLine,
  };
}
