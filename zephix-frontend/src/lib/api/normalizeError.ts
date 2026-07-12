import axios, { type AxiosError } from "axios";

import type { StandardError, StandardErrorCode } from "@/lib/api/types";

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

function readBodyMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const message = (data as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message)) {
    const joined = message.filter((m): m is string => typeof m === "string").join(" ");
    return joined.trim() ? joined : undefined;
  }
  return undefined;
}

/** Prefer backend / AppException `.code` when present (do not flatten to SERVER_ERROR). */
function readBodyCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" && code.trim() ? code : undefined;
}

function readPlainErrorCode(error: Error): string | undefined {
  if (!("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.trim() ? code : undefined;
}

function mapStatusToCode(status: number, error: AxiosError): StandardErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "AUTH_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status >= 500) return "SERVER_ERROR";
  if (
    !error.response &&
    (error.code === "ECONNABORTED" || /timeout/i.test(String(error.message || "")))
  ) {
    return "NETWORK_ERROR";
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "NETWORK_ERROR";
  }
  return "SERVER_ERROR";
}

/**
 * Normalize any thrown/rejected API error to {@link StandardError} for Stack 1 (`lib/api.ts`).
 * Intentionally separate from Stack 2 `ApiClient.normalizeError` (hard constraint: do not modify Stack 2).
 *
 * Preserves custom codes from:
 * - Axios `response.data.code` (backend AppException / ErrorCode)
 * - Plain `Error` with a `.code` string (e.g. client-thrown WORKSPACE_REQUIRED)
 */
export function normalizeAxiosError(error: unknown): StandardError {
  if (axios.isAxiosError(error)) {
    return normalizeAxiosErrorInner(error);
  }
  if (error instanceof Error) {
    return {
      code: (readPlainErrorCode(error) ?? "SERVER_ERROR") as StandardErrorCode,
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
  const body = error.response?.data;
  const message = readBodyMessage(body) || error.message || "An error occurred";
  const bodyCode = readBodyCode(body);
  const code: StandardErrorCode = (bodyCode ?? mapStatusToCode(status, error)) as StandardErrorCode;

  const resolvedStatus = status > 0 ? status : code === "NETWORK_ERROR" ? 0 : 500;

  return {
    code,
    message,
    status: resolvedStatus,
    timestamp: new Date().toISOString(),
    requestId: readRequestIdFromConfig(error.config),
  };
}
