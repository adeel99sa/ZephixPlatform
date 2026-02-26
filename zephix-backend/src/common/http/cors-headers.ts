export const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Cache-Control',
  'cache-control',
  'Pragma',
  'pragma',
  'X-Request-Id',
  'x-request-id',
  'x-correlation-id',
  'X-Correlation-Id',
  'x-org-id',
  'X-CSRF-Token',
  'x-csrf-token',
  'X-XSRF-TOKEN',
  'x-xsrf-token',
  'X-Workspace-Id',
  'x-workspace-id',
] as const;

export const CORS_EXPOSED_HEADERS = [
  'X-Request-Id',
  'x-request-id',
  'X-Correlation-Id',
  'x-correlation-id',
  'Set-Cookie',
] as const;

export function buildCorsAllowedHeaders(): string[] {
  return [...CORS_ALLOWED_HEADERS];
}

export function buildCorsExposedHeaders(): string[] {
  return [...CORS_EXPOSED_HEADERS];
}
