export type AIGovernanceSummaryContract = {
  aiGovernanceEnabled: boolean;
  dataRetentionPolicy: string;
  modelAllowlist: string[];
};

export function buildAIGovernanceSummaryContract(): AIGovernanceSummaryContract {
  return {
    aiGovernanceEnabled: false,
    dataRetentionPolicy: 'none',
    modelAllowlist: [],
  };
}