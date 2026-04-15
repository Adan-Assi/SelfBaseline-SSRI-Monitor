import type { UploadSensorBatchRequest } from "../features/sensors/sensorsApi.types";

// --- Constants --------------------
export const TASK = "SAFE_SENSOR_UPLOAD_TWICE_DAILY";
export const WINDOW_MIN = 20;
export const QUEUE_KEY = "safeUpload:queue:v2";

export const SLOTS = [
  { name: "noon", hour: 12, minute: 0 },
  { name: "night", hour: 23, minute: 0 },
] as const;

// --- Types --------------------
export type SlotName = (typeof SLOTS)[number]["name"];

export type QueuedUpload = {
  dayKey: string;
  slot: SlotName;
  payload: UploadSensorBatchRequest;
};

// --- Time utils --------------------
export function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const da = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function mins(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

export function slotMins(h: number, m: number) {
  return h * 60 + m;
}

export function within(a: number, b: number, w: number) {
  return Math.abs(a - b) <= w;
}
