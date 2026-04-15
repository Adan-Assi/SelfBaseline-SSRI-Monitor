// --- Types --------------------
export type ApiErrorCode =
  | "NETWORK"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "SERVER"
  | "UNKNOWN";

// --- Error class --------------------
export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  details?: unknown;

  constructor(
    message: string,
    code: ApiErrorCode = "UNKNOWN",
    status?: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// --- Type guards --------------------
export function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && (e as any).name === "ApiError";
}

// --- User-facing messages --------------------
export function toUserMessage(
  e: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (isApiError(e)) {
    switch (e.code) {
      case "NETWORK":
        return "No internet connection. Please check your network and try again.";
      case "TIMEOUT":
        return "The request timed out. Please try again.";
      case "UNAUTHORIZED":
        return "Your session expired. Please log in again.";
      case "FORBIDDEN":
        return "You don't have permission to do this.";
      default:
        return fallback;
    }
  }

  const msg = typeof e === "string" ? e : (e as any)?.message;

  if (typeof msg === "string") {
    if (msg.toLowerCase().includes("network")) {
      return "No internet connection. Please check your network and try again.";
    }

    return fallback;
  }

  return fallback;
}
