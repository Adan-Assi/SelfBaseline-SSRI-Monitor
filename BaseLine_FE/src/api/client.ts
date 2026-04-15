import { API_BASE_URL } from "../config/runtime";
import { ApiError } from "./errors";

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;

async function parseErrorBody(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return "";

  try {
    const json = JSON.parse(text);

    const detail = (json as any)?.detail;

    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return JSON.stringify(detail);

    return typeof json === "string" ? json : JSON.stringify(json);
  } catch {
    return text;
  }
}

function mapStatusToCode(status: number) {
  if (status === 400) return "BAD_REQUEST" as const;
  if (status === 401) return "UNAUTHORIZED" as const;
  if (status === 403) return "FORBIDDEN" as const;
  if (status === 404) return "NOT_FOUND" as const;
  if (status >= 500) return "SERVER" as const;
  return "UNKNOWN" as const;
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeoutId),
  };
}

export async function request<T>(
  path: string,
  options: Options = {},
): Promise<T> {
  // --- Request setup --------------------
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const { signal, cancel } = createTimeoutSignal(timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal,
    });

    // --- HTTP error handling --------------------
    if (!res.ok) {
      const body = await parseErrorBody(res);
      const code = mapStatusToCode(res.status);

      throw new ApiError(body || `HTTP ${res.status}`, code, res.status, body);
    }

    // --- Success response parsing --------------------
    const text = await res.text().catch(() => "");
    return (text ? JSON.parse(text) : ({} as any)) as T;
  } catch (e: any) {
    // --- Timeout handling --------------------
    if (e?.name === "AbortError") {
      throw new ApiError("Request timed out", "TIMEOUT");
    }

    // --- Network error handling --------------------
    const msg = typeof e?.message === "string" ? e.message : "";

    if (
      msg.toLowerCase().includes("network") ||
      msg.toLowerCase().includes("failed to fetch") ||
      msg.toLowerCase().includes("network request failed")
    ) {
      throw new ApiError("Network error", "NETWORK");
    }

    // Re-throw normalized API errors
    if (e?.name === "ApiError") throw e;

    // Fallback for unexpected failures
    throw new ApiError("Unknown error", "UNKNOWN", undefined, e);
  } finally {
    cancel();
  }
}

export const api = {
  get: <T>(path: string, options?: Omit<Options, "method" | "body">) =>
    request<T>(path, { ...(options ?? {}), method: "GET" }),

  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<Options, "method" | "body">,
  ) => request<T>(path, { ...(options ?? {}), method: "POST", body }),

  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<Options, "method" | "body">,
  ) => request<T>(path, { ...(options ?? {}), method: "PUT", body }),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<Options, "method" | "body">,
  ) => request<T>(path, { ...(options ?? {}), method: "PATCH", body }),

  del: <T>(path: string, options?: Omit<Options, "method" | "body">) =>
    request<T>(path, { ...(options ?? {}), method: "DELETE" }),
};
