export class RiskStatsDto {
  totalRisks: number;
  activeRisks: number;
  closedRisks: number;
  highPriorityRisks: number;
  overdueRisks: number;
  risksBySeverity: { [key: string]: number };
  risksByStatus: { [key: string]: number };
  risksByType: { [key: string]: number };
  averageRiskScore: number;
  probabilityDistribution: {
    low: number;
    medium: number;
    high: number;
    average: number;
  };
  topRisks: any[];
  recentActivity: any;
}
