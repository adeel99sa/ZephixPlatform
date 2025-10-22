export const adminFlags = {
  security: false,        // Hide until backend endpoint is ready
  billing: true,          // Enable when ready
  integrations: true,     // Enable when ready
  auditLogs: true,        // Enable when ready
  workspaces: true,       // Enable when ready
  apiKeys: true,          // Enable when ready
  kpis: true,             // Enable when ready
  templates: true,        // Enable when ready
} as const;

export const settingsFlags = {
  security: false,        // Hide until backend endpoint is ready
} as const;
