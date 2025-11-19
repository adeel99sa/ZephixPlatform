const flags = (import.meta.env.VITE_FLAGS || "").split(",").map(s => s.trim());
export const hasFlag = (f: string) => flags.includes(f);

// Workspace membership feature flag
export const isWorkspaceMembershipV1Enabled = () => {
  return import.meta.env.VITE_WS_MEMBERSHIP_V1 === '1' || hasFlag('workspaceMembershipV1');
};

// Resource AI risk scoring feature flag
export const isResourceRiskAIEnabled = () => {
  return import.meta.env.VITE_RESOURCE_AI_RISK_SCORING_V1 === '1' || hasFlag('resourceRiskAI');
};
