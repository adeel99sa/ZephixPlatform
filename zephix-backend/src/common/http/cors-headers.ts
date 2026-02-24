export function buildCorsAllowedHeaders(): string[] {
  return [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'x-request-id',
    'X-CSRF-Token',
    'x-csrf-token',
    'X-XSRF-TOKEN',
    'x-xsrf-token',
    'x-org-id',
    'X-Workspace-Id',
    'x-workspace-id',
  ];
}

