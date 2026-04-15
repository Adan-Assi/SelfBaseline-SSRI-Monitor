export type WifiLocationSample = {
  ts: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  source?: string;
};

type WifiSample = {
  ts: string;
  bssid: string;
  frequency: number | null;
  signal_level: number;
};

type DeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export function buildWifiLocationFromScan(
  wifi: WifiSample[],
  deviceLocation: DeviceLocation | null | undefined,
): WifiLocationSample | undefined {
  const ts = wifi[0]?.ts ?? new Date().toISOString();

  if (!wifi.length) return undefined;
  if (!deviceLocation) return undefined;

  return {
    ts,
    latitude: deviceLocation.latitude,
    longitude: deviceLocation.longitude,
    accuracy: deviceLocation.accuracy ?? null,
    source: "wifi",
  };
}
