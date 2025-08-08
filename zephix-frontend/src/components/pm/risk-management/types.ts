export interface RiskManagementDashboardProps {
  projectId: string;
  onRiskAnalyzed?: (analysisId: string) => void;
}

export interface RiskData {
  id: string;
  title: string;
  description: string;
  category: string;
  probability: {
    score: number;
    confidence: number;
    rationale: string;
  };
  impact: {
    schedule: number;
    budget: number;
    scope: number;
    quality: number;
    overall: number;
  };
  riskScore: number;
  riskLevel: string;
  status: string;
  owner?: string;
  createdAt: string;
  triggers: {
    warningSignals: string[];
    leadIndicators: string[];
  };
}

export interface RiskSummary {
  totalRisks: number;
  activeRisks: number;
  newRisks: number;
  closedRisks: number;
  riskDistribution: {
    veryHigh: number;
    high: number;
    medium: number;
    low: number;
    veryLow: number;
  };
  categoryBreakdown: Record<string, number>;
}
