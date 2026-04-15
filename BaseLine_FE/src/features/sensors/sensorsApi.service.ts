import { api } from "../../api/client";

import type {
  UploadSensorBatchRequest,
  UploadSensorBatchResponse,
} from "./sensorsApi.types";

//--- Uploads one sensor batch to the backend --------------------
export async function uploadSensorBatchToBackend(
  payload: UploadSensorBatchRequest,
) {
  return api.post<UploadSensorBatchResponse>("/sensors/batch", payload);
}
