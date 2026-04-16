/**
 * Production axios `baseURL` is `…/api` (see `VITE_API_URL`). Some modules still
 * pass paths like `/api/dashboards/…`, which resolves to `/api/api/…` and 404s.
 */
export function normalizeDuplicateApiPath(
  url: string | undefined,
  baseURL: string | undefined,
): string | undefined {
  if (url == null || url === "") return url;
  const u = String(url);
  const b = String(baseURL || "").replace(/\/+$/, "");
  if (!b.endsWith("/api")) return url;
  if (u === "/api") return "/";
  if (u.startsWith("/api/")) return u.slice(4);
  return url;
}
