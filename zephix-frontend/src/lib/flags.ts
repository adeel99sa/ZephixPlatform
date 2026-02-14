const flags = (import.meta.env.VITE_FLAGS || "").split(",").map((s: string) => s.trim());
export const hasFlag = (f: string) => flags.includes(f);

// Workspace membership feature flag
export const isWorkspaceMembershipV1Enabled = () => {
  return import.meta.env.VITE_WS_MEMBERSHIP_V1 === '1' || hasFlag('workspaceMembershipV1');
};

// Resource AI risk scoring feature flag
export const isResourceRiskAIEnabled = () => {
  return import.meta.env.VITE_RESOURCE_AI_RISK_SCORING_V1 === '1' || hasFlag('resourceRiskAI');
};

// Risks feature flag - controls create/edit UI
export const isRisksEnabled = () => {
  const envValue = import.meta.env.VITE_FEATURE_RISKS;
  return envValue === '1' || envValue === 'true' || hasFlag('risksEnabled');
};

// Resources feature flag - controls create/edit/delete UI for allocations
export const isResourcesEnabled = () => {
  const envValue = import.meta.env.VITE_FEATURE_RESOURCES;
  return envValue === '1' || envValue === 'true' || hasFlag('resourcesEnabled');
};

// Phase 2E: Capacity Engine feature flag
export const isCapacityEngineEnabled = () => {
  const envValue = import.meta.env.VITE_FEATURE_CAPACITY;
  return envValue === '1' || envValue === 'true' || hasFlag('capacityEngine');
};
