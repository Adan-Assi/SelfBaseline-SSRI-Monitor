/**Backend sensor API contract
 * These types represent the payloads expected by the backend.
 */

// --- Supported backend sensor names --------------------
export type SensorTypeName =
  | "gps"
  | "wifi"
  | "wifi_location"
  | "phonecharge"
  | "phonecharge_period"
  | "app_sessions";

// --- Individual backend sensor payloads --------------------
export type GpsApiSensor = {
  type: "gps";
  ts: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number;
  speed: number;
  heading: number;
  source: string;
  window_start?: string;
  window_end?: string;
};

export type WifiApiSensor = {
  type: "wifi";
  ts: string;
  bssid: string;
  frequency: number;
  signalLevel: number;
  scan_id?: string;
};

export type WifiLocationApiSensor = {
  type: "wifi_location";
  ts: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  source?: string;
};

export type PhoneChargeApiSensor = {
  type: "phonecharge";
  ts: string;
  battery_level: number;
  is_charging: boolean;
  power_save?: boolean;
  power_source?: string;
};

export type PhoneChargePeriodApiSensor = {
  type: "phonecharge_period";
  start_ts: string;
  end_ts: string;
  state: string;
  start_level: number;
  end_level: number;
};

export type AppSessionApiSensor = {
  type: "app_sessions";
  start_ts: string;
  end_ts: string;
  state?: string;
};

// --- Union of all backend sensor payloads --------------------
export type SensorReadingApi =
  | GpsApiSensor
  | WifiApiSensor
  | WifiLocationApiSensor
  | PhoneChargeApiSensor
  | PhoneChargePeriodApiSensor
  | AppSessionApiSensor;

// --- Request / response shapes --------------------
export type UploadSensorBatchRequest = {
  userId: number;
  deviceTime: string;
  sensors: SensorReadingApi[];
};

export type UploadSensorBatchResponse = {
  upload_id: number;
  user_id: number;
  inserted: Record<string, number>;
  total: number;
};
