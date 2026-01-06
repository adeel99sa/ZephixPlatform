export const WORKSPACE_MODULES = {
  resource_intelligence: {
    key: 'resource_intelligence',
    name: 'Resource Intelligence',
    defaultEnabled: true,
    defaultConfig: { hardCap: 110 },
    version: 1,
  },
  risk_sentinel: {
    key: 'risk_sentinel',
    name: 'Risk Sentinel',
    defaultEnabled: true,
    defaultConfig: { sensitivity: 'high' },
    version: 1,
  },
  portfolio_rollups: {
    key: 'portfolio_rollups',
    name: 'Portfolio Rollups',
    defaultEnabled: false,
    defaultConfig: null,
    version: 1,
  },
  ai_assistant: {
    key: 'ai_assistant',
    name: 'AI Assistant',
    defaultEnabled: false,
    defaultConfig: null,
    version: 1,
  },
  document_processing: {
    key: 'document_processing',
    name: 'Document Processing',
    defaultEnabled: false,
    defaultConfig: null,
    version: 1,
  },
} as const;

export type WorkspaceModuleKey = keyof typeof WORKSPACE_MODULES;

export function getModuleDefaults(key: string): {
  enabled: boolean;
  config: any;
  version: number;
} | null {
  const module = WORKSPACE_MODULES[key as WorkspaceModuleKey];
  if (!module) {
    return null;
  }
  return {
    enabled: module.defaultEnabled,
    config: module.defaultConfig,
    version: module.version,
  };
}

