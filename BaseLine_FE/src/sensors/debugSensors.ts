import { log } from "../utils/logger";
import type { SensorBatch } from "./sensorTypes";
export function logSensorBatch(batch: SensorBatch) {
  log("========== SENSOR DEBUG ==========");

  log("deviceTime:", batch.deviceTime);
  log("window:", batch.windowStart, "→", batch.windowEnd);

  log("\n--- GPS ---");
  log(JSON.stringify(batch.sensors?.gps ?? null, null, 2));

  log("\n--- Phone Charge ---");
  log(JSON.stringify(batch.sensors?.phonecharge ?? null, null, 2));

  log("\n--- Phone Charge Period ---");
  log(JSON.stringify(batch.sensors?.phonecharge_period ?? null, null, 2));

  log("\n--- App Sessions ---");
  log(JSON.stringify(batch.sensors?.app_sessions ?? null, null, 2));

  log("\n--- WiFi Scan ---");
  log(JSON.stringify(batch.sensors?.wifi ?? null, null, 2));

  log("\n--- WiFi Location ---");
  log(JSON.stringify(batch.sensors?.wifi_location ?? null, null, 2));

  log("==================================");
}
