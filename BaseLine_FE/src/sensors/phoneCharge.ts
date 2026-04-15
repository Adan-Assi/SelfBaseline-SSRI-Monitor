import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Battery from "expo-battery";

const KEY_OPEN_PERIOD = "sensor:phonecharge:openPeriod:v1";

// --- Types --------------------
type SnapshotBatteryState =
  | "unknown"
  | "unplugged"
  | "charging"
  | "full"
  | "notSupported";

type PeriodBatteryState =
  | "unknown"
  | "unplugged"
  | "charging"
  | "full"
  | "not_charging";

// --- State mappers --------------------
function toSnapshotStateStr(state: Battery.BatteryState): SnapshotBatteryState {
  switch (state) {
    case Battery.BatteryState.UNPLUGGED:
      return "unplugged";
    case Battery.BatteryState.CHARGING:
      return "charging";
    case Battery.BatteryState.FULL:
      return "full";
    default:
      return "unknown";
  }
}

function toPeriodStateStr(
  state: Battery.BatteryState,
  isLowPowerMode: boolean | null,
): PeriodBatteryState {
  switch (state) {
    case Battery.BatteryState.UNPLUGGED:
      return "unplugged";
    case Battery.BatteryState.CHARGING:
      return "charging";
    case Battery.BatteryState.FULL:
      return "full";
    default:
      return "unknown";
  }
}

// --- Helpers --------------------
function nowIso() {
  return new Date().toISOString();
}

async function loadJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function saveJson(key: string, value: any) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export type PhoneChargeSnapshot = {
  ts: string;
  batteryLevel: number | null;
  batteryState: SnapshotBatteryState;
  powerMode: "normal" | "lowPower" | "unknown";
};

export type PhoneChargePeriod = {
  start: string;
  end?: string;
  state: PeriodBatteryState;
  startLevel?: number | null;
  endLevel?: number | null;
};

export type PhoneChargeResult = {
  snapshot: PhoneChargeSnapshot;
  periodEvent?: PhoneChargePeriod;
};

// --- Phone charge collection --------------------
export async function collectPhoneCharge(): Promise<PhoneChargeResult> {
  const ts = nowIso();

  const [levelRaw, stateRaw, lowPower] = await Promise.all([
    Battery.getBatteryLevelAsync().catch(() => null),
    Battery.getBatteryStateAsync().catch(() => Battery.BatteryState.UNKNOWN),
    Battery.isLowPowerModeEnabledAsync().catch(() => null),
  ]);

  const batteryLevel =
    typeof levelRaw === "number" ? Math.round(levelRaw * 100) / 100 : null;

  const snapshotState = toSnapshotStateStr(stateRaw);
  const periodState = toPeriodStateStr(stateRaw, lowPower);

  const powerMode =
    lowPower === null ? "unknown" : lowPower ? "lowPower" : "normal";

  const snapshot: PhoneChargeSnapshot = {
    ts,
    batteryLevel,
    batteryState: snapshotState,
    powerMode,
  };

  // --- Open period tracking --------------------
  const prev = await loadJson<PhoneChargePeriod>(KEY_OPEN_PERIOD);

  if (!prev) {
    await saveJson(KEY_OPEN_PERIOD, {
      start: ts,
      state: periodState,
      startLevel: batteryLevel,
    });

    return { snapshot };
  }

  if (prev.state === periodState) {
    return { snapshot };
  }

  const closed: PhoneChargePeriod = {
    ...prev,
    end: ts,
    endLevel: batteryLevel,
  };

  await saveJson(KEY_OPEN_PERIOD, {
    start: ts,
    state: periodState,
    startLevel: batteryLevel,
  });

  return { snapshot, periodEvent: closed };
}
