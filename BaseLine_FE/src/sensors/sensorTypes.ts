/* These types represent locally collected sensor data only.
 *
 * Backend upload format is defined in:
 * src/features/sensors/sensorsApi.types.ts
 */

// --- Sensor batch payload --------------------
export type SensorBatch = {
  deviceTime: string; // ISO
  windowStart: string; // ISO
  windowEnd: string; // ISO

  sensors: {
    // --- GPS samples --------------------
    gps?: {
      ts: string;
      latitude: number;
      longitude: number;
      accuracy?: number | null;
      altitude?: number | null;
      speed?: number | null;
      heading?: number | null;
    }[];

    // --- Battery / charging snapshot --------------------
    phonecharge?: {
      ts: string;
      batteryLevel: number | null; // usually 0..1 from Expo
      batteryState:
        | "unknown"
        | "unplugged"
        | "charging"
        | "full"
        | "notSupported";
      powerMode?: "normal" | "lowPower" | "unknown";
    };

    // --- Charging periods --------------------
    // Emitted when charging state changes
    // end missing => period is still open
    phonecharge_period?: {
      start: string;
      end?: string;
      state: "unknown" | "unplugged" | "charging" | "full" | "not_charging";
      startLevel?: number | null;
      endLevel?: number | null;
    };

    // --- App sessions --------------------
    app_sessions?: {
      start: string;
      end: string;
      state: "foreground" | "background";
    }[];

    // --- Nearby Wi-Fi networks --------------------
    wifi?: {
      ts: string; // ISO
      bssid: string;
      frequency: number | null;
      signal_level: number;
    }[];

    // --- Wi-Fi derived location --------------------

    wifi_location?: {
      ts: string; // ISO
      latitude: number;
      longitude: number;
      accuracy: number | null;
      source?: string;
    };
  };
};
