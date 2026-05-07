import axios, { type AxiosError } from "axios";

import type { StandardError } from "@/lib/api/types";

function readRequestIdFromConfig(config: unknown): string | undefined {
  if (!config || typeof config !== "object") return undefined;
  const headers = (config as { headers?: unknown }).headers;
  if (!headers || typeof headers !== "object") return undefined;
  const maybeGet = (headers as { get?: (n: string) => unknown }).get;
  if (typeof maybeGet === "function") {
    const rid = maybeGet.call(headers, "x-request-id") ?? maybeGet.call(headers, "X-Request-Id");
    return typeof rid === "string" ? rid : undefined;
  }
  const h = headers as Record<string, unknown>;
  const v = h["x-request-id"] ?? h["X-Request-Id"];
  return typeof v === "string" ? v : undefined;
}

/**
 * Normalize any thrown/rejected API error to {@link StandardError} for Stack 1 (`lib/api.ts`).
 * Intentionally separate from Stack 2 `ApiClient.normalizeError` (hard constraint: do not modify Stack 2).
 */
export function normalizeAxiosError(error: unknown): StandardError {
  if (axios.isAxiosError(error)) {
    return normalizeAxiosErrorInner(error);
  }
  if (error instanceof Error) {
    return {
      code: "SERVER_ERROR",
      message: error.message,
      status: 500,
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: "SERVER_ERROR",
    message: "An error occurred",
    status: 500,
    timestamp: new Date().toISOString(),
  };
}

function normalizeAxiosErrorInner(error: AxiosError): StandardError {
  const status = error.response?.status ?? 0;
  const errorData = error.response?.data as { message?: string } | undefined;
  const message = errorData?.message || error.message || "An error occurred";

  let code: StandardError["code"] = "SERVER_ERROR";
  if (status === 400) code = "VALIDATION_ERROR";
  else if (status === 401) code = "AUTH_ERROR";
  else if (status === 404) code = "NOT_FOUND";
  else if (status >= 500) code = "SERVER_ERROR";
  else if (
    !error.response &&
    (error.code === "ECONNABORTED" || /timeout/i.test(String(error.message || "")))
  ) {
    code = "NETWORK_ERROR";
  } else if (typeof navigator !== "undefined" && !navigator.onLine) {
    code = "NETWORK_ERROR";
  }

  const resolvedStatus = status > 0 ? status : code === "NETWORK_ERROR" ? 0 : 500;

  return {
    code,
    message,
    status: resolvedStatus,
    timestamp: new Date().toISOString(),
    requestId: readRequestIdFromConfig(error.config),
  };
}
