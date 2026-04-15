import {
  getRuntimePolicy,
  hasUsableBackendUserId,
} from "../config/runtimePolicy";
import { useAuthStore } from "../features/auth/auth.store";
import { mapSensorBatchToApi } from "../features/sensors/mapSensorBatchToApi";
import { uploadSensorBatchToBackend } from "../features/sensors/sensorsApi.service";
import { collectSafeSensors } from "../sensors/collectSafeSensors";
import { log } from "../utils/logger";

import {
  alreadySent,
  enqueue,
  loadQueue,
  markSent,
  saveQueue,
} from "./safeUpload.queue";
import {
  dayKey,
  mins,
  slotMins,
  SLOTS,
  WINDOW_MIN,
  within,
  type QueuedUpload,
} from "./safeUpload.shared";

function formatTime(d: Date) {
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// --- Backend upload --------------------
export async function uploadToBE(
  payload: Parameters<typeof uploadSensorBatchToBackend>[0],
) {
  const { userId } = useAuthStore.getState();
  const policy = getRuntimePolicy();

  log("[safeUpload] upload start", {
    sensorsCount: payload.sensors.length,
    userId,
    mode: policy.mode,
  });

  if (!policy.useBackend) {
    log("[safeUpload] upload skipped", {
      reason: "backend_disabled",
    });
    return true;
  }

  if (!hasUsableBackendUserId(userId)) {
    if (policy.allowFallback) {
      log("[safeUpload] upload skipped", {
        reason: "no_backend_user_fallback",
      });
      return true;
    }

    throw new Error("Missing auth user id for sensor upload");
  }

  const res = await uploadSensorBatchToBackend(payload);

  log("[safeUpload] upload success", {
    total: res?.total,
    uploadId: res?.upload_id,
    userId: res?.user_id,
    inserted: res?.inserted,
  });

  return true;
}

// --- Retry queued uploads first --------------------
export async function flushQueue() {
  const q = await loadQueue();

  if (!q.length) return;

  log("[safeUpload] flushing queue", {
    queuedItems: q.length,
  });

  const keep: QueuedUpload[] = [];

  for (const item of q) {
    try {
      const ok = await uploadToBE(item.payload);

      if (!ok) {
        keep.push(item);
      }
    } catch (e) {
      log("[safeUpload] queued retry failed", {
        dayKey: item.dayKey,
        slot: item.slot,
        error: e,
      });

      keep.push(item);
    }
  }

  await saveQueue(keep);

  log("[safeUpload] queue flush done", {
    keptItems: keep.length,
  });
}

// --- Main upload runner --------------------
export async function trySafeUploadIfDue(trigger: "bg" | "fg") {
  const { userId } = useAuthStore.getState();
  const policy = getRuntimePolicy();

  if (!policy.useBackend) {
    log("[safeUpload] check skipped", {
      trigger,
      reason: "backend_disabled",
    });
    return;
  }

  if (!hasUsableBackendUserId(userId)) {
    log("[safeUpload] check skipped", {
      trigger,
      reason: policy.allowFallback
        ? "no_backend_user_fallback"
        : "missing_user",
    });
    return;
  }

  await flushQueue();

  const now = new Date();
  const dk = dayKey(now);
  const nowMin = mins(now);

  const matchingSlot = SLOTS.find((s) =>
    within(nowMin, slotMins(s.hour, s.minute), WINDOW_MIN),
  );

  if (!matchingSlot) {
    log("[safeUpload] check skipped", {
      trigger,
      reason: "outside_window",
      dayKey: dk,
      time: formatTime(now),
    });
    return;
  }

  log("[safeUpload] slot matched", {
    trigger,
    slot: matchingSlot.name,
    dayKey: dk,
    time: formatTime(now),
  });

  if (await alreadySent(dk, matchingSlot.name)) {
    log("[safeUpload] already sent", {
      dayKey: dk,
      slot: matchingSlot.name,
    });
    return;
  }

  const windowEnd = now;
  const windowStart =
    matchingSlot.name === "noon"
      ? new Date(now.getTime() - 12 * 60 * 60 * 1000)
      : new Date(now.getTime() - 11 * 60 * 60 * 1000);

  log("[safeUpload] collecting sensors", {
    slot: matchingSlot.name,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
  });

  const batch = await collectSafeSensors(windowStart, windowEnd);

  log("[safeUpload] batch collected", {
    slot: matchingSlot.name,
    gps: batch.sensors.gps?.length ?? 0,
    wifi: batch.sensors.wifi?.length ?? 0,
    wifiLocation: !!batch.sensors.wifi_location,
    phoneCharge: !!batch.sensors.phonecharge,
    phoneChargePeriod: !!batch.sensors.phonecharge_period,
    appSessions: batch.sensors.app_sessions?.length ?? 0,
  });

  const payload = mapSensorBatchToApi(batch, userId as number);

  if (!payload.sensors.length) {
    log("[safeUpload] no sensors -> skipped", {
      slot: matchingSlot.name,
    });
    return;
  }

  log("[safeUpload] payload ready", {
    slot: matchingSlot.name,
    sensorsCount: payload.sensors.length,
  });

  try {
    const ok = await uploadToBE(payload);

    if (ok) {
      await markSent(dk, matchingSlot.name);

      log("[safeUpload] marked sent", {
        dayKey: dk,
        slot: matchingSlot.name,
      });
    } else {
      await enqueue({
        dayKey: dk,
        slot: matchingSlot.name,
        payload,
      });

      log("[safeUpload] upload deferred -> queued", {
        dayKey: dk,
        slot: matchingSlot.name,
      });
    }
  } catch (e) {
    log("[safeUpload] upload failed -> queued", {
      dayKey: dk,
      slot: matchingSlot.name,
      error: e,
    });

    await enqueue({
      dayKey: dk,
      slot: matchingSlot.name,
      payload,
    });
  }
}
