import {
  getRuntimePolicy,
  hasUsableBackendUserId,
} from "../../config/runtimePolicy";
import { useAuthStore } from "../auth/auth.store";
import { mapSensorBatchToApi } from "./mapSensorBatchToApi";
import { uploadSensorBatchToBackend } from "./sensorsApi.service";

import type { SensorBatch } from "../../sensors/sensorTypes";
import { log } from "../../utils/logger";
import type { UploadSensorBatchRequest } from "./sensorsApi.types";

// --- Payload guards --------------------
function hasCollectedSensorData(batch: SensorBatch): boolean {
  return !!(
    batch.sensors.gps?.length ||
    batch.sensors.wifi?.length ||
    batch.sensors.wifi_location ||
    batch.sensors.phonecharge ||
    batch.sensors.phonecharge_period ||
    batch.sensors.app_sessions?.length
  );
}

export function buildSensorUploadPayload(
  batch: SensorBatch,
  userId: number,
): UploadSensorBatchRequest | null {
  if (!hasCollectedSensorData(batch)) return null;

  const payload = mapSensorBatchToApi(batch, userId);
  if (!payload.sensors.length) return null;

  return payload;
}

// --- Upload flow --------------------
export async function uploadCollectedSensorBatch(batch: SensorBatch) {
  const { userId } = useAuthStore.getState();
  const policy = getRuntimePolicy();

  if (!policy.useBackend) {
    log("[Sensors] upload skipped", { reason: "backend_disabled" });
    return { skipped: true as const, reason: "backend_disabled" as const };
  }

  if (!hasUsableBackendUserId(userId)) {
    if (policy.allowFallback) {
      log("[Sensors] upload skipped", { reason: "fallback_mode" });
      return { skipped: true as const, reason: "fallback_mode" as const };
    }

    throw new Error("Missing auth user id for sensor upload");
  }

  const payload = buildSensorUploadPayload(batch, userId as number);

  if (!payload) {
    log("[Sensors] upload skipped", { reason: "no_sensor_data" });
    return { skipped: true as const, reason: "no_sensor_data" as const };
  }

  // --- Light summary (safe) --------------------
  const counts: Record<string, number> = {};
  for (const sensor of payload.sensors) {
    counts[sensor.type] = (counts[sensor.type] || 0) + 1;
  }

  log("[Sensors] upload start", {
    sensorsCount: payload.sensors.length,
    types: counts,
  });

  try {
    const response = await uploadSensorBatchToBackend(payload);

    log("[Sensors] upload success", {
      total: payload.sensors.length,
      inserted: response?.inserted,
    });

    return {
      skipped: false as const,
      payload,
      response,
    };
  } catch (e) {
    log("[Sensors] upload failed", e);
    throw e;
  }
}
