import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

import { log } from "../utils/logger";
import { trySafeUploadIfDue } from "./safeUpload.runner";
import { TASK } from "./safeUpload.shared";

export { trySafeUploadIfDue } from "./safeUpload.runner";

// --- Task definition --------------------
if (!TaskManager.isTaskDefined(TASK)) {
  TaskManager.defineTask(TASK, async () => {
    console.log("[safeUpload] bg task fired");

    try {
      await trySafeUploadIfDue("bg");
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (e) {
      console.log("[safeUpload] bg failed", e);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

// --- Task registration --------------------
export async function registerSafeUploader() {
  const status = await BackgroundFetch.getStatusAsync();

  if (
    status === BackgroundFetch.BackgroundFetchStatus.Denied ||
    status === BackgroundFetch.BackgroundFetchStatus.Restricted
  ) {
    log("[safeUpload] background fetch not allowed");
    return;
  }

  const isReg = await TaskManager.isTaskRegisteredAsync(TASK);

  if (!isReg) {
    await BackgroundFetch.registerTaskAsync(TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}
