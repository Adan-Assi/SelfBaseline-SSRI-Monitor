import {
  getForegroundLocationSampleOnce,
  getLastBackgroundLocationSample,
} from "../gps";

import { log } from "../../utils/logger";

export async function collectGpsSample() {
  const bg = await getLastBackgroundLocationSample();

  if (bg) {
    log("[Sensors] gps -> using background sample");
    return bg;
  }

  const fg = await getForegroundLocationSampleOnce();

  if (fg) {
    log("[Sensors] gps -> using foreground fallback sample");
    return fg;
  }

  log("[Sensors] gps -> no sample available (bg + fg are null)");
  return null;
}
