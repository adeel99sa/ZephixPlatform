/**
 * Normalize API base URLs from env vars.
 *
 * Expected backend routes are mounted under `/api`.
 * If an absolute host URL is provided without a path, append `/api`
 * so auth calls do not hit `/auth/*` and 404 with "Cannot POST /auth/login".
 */
export function resolveApiBaseUrl(raw: unknown, fallback: string): string {
  const candidate = String(raw || fallback).trim();
  const normalized = candidate.replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path === "" || path === "/") {
      parsed.pathname = "/api";
      return parsed.toString().replace(/\/+$/, "");
    }
    return normalized;
  } catch {
    return normalized;
  }
}
