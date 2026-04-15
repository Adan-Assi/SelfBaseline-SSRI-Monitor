import { DEBUG_LOGS } from "../config/runtime";

export const log = (...args: any[]) => {
  if (__DEV__ || DEBUG_LOGS) console.log(...args);
};

export const warn = (...args: any[]) => {
  if (__DEV__ || DEBUG_LOGS) console.warn(...args);
};

export const error = (...args: any[]) => {
  console.error(...args);
};
export function logSensorErr(name: string, err: unknown) {
  const msg =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === "string"
        ? err
        : JSON.stringify(err);

  log(`[Sensors] ${name} failed -> ${msg}`);
}
