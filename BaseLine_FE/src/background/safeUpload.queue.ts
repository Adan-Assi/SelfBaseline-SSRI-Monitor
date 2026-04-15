import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  QUEUE_KEY,
  type QueuedUpload,
  type SlotName,
} from "./safeUpload.shared";

// --- Slot sent markers --------------------
export async function alreadySent(dk: string, slot: SlotName) {
  return (await AsyncStorage.getItem(`safeUpload:${dk}:${slot}`)) === "1";
}

export async function markSent(dk: string, slot: SlotName) {
  await AsyncStorage.setItem(`safeUpload:${dk}:${slot}`, "1");
}

// --- Queue helpers --------------------
export async function loadQueue(): Promise<QueuedUpload[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];

  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveQueue(items: QueuedUpload[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueue(item: QueuedUpload) {
  const q = await loadQueue();
  q.push(item);
  await saveQueue(q);
}
