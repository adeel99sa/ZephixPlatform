/**
 * Phase 4A: Organization Dashboard API Client
 *
 * All endpoints require platform ADMIN. Backend enforces gating.
 */
import { api } from '@/lib/api';

export interface OrgAnalyticsSummary {
  workspaceCount: number;
  portfolioCount: number;
  projectCount: number;
  atRiskProjectsCount: number;
  evEligibleProjectsCount: number;
  aggregateCPI: number | null;
  aggregateSPI: number | null;
  totalBudget: number;
  totalActualCost: number;
  planCode: string;
  planStatus: string;
  warnings: string[];
  timestamp: string;
  lastUpdatedAt: string;
}

export interface WorkspaceWeeklyUtilization {
  workspaceId: string;
  workspaceName: string;
  weekStart: string;
  totalCapacityHours: number;
  totalDemandHours: number;
  utilization: number;
}

export interface OverallocatedUserEntry {
  userId: string;
  workspaceId: string;
  overallocatedDays: number;
  peakUtilization: number;
}

export interface OrgAnalyticsCapacity {
  utilizationByWorkspace: WorkspaceWeeklyUtilization[];
  topOverallocatedUsers: OverallocatedUserEntry[];
  overallocationDaysTotal: number;
  warnings: string[];
  timestamp: string;
}

export interface WorkspaceStorageEntry {
  workspaceId: string;
  usedBytes: number;
  reservedBytes: number;
  limitBytes: number | null;
  percentUsed: number;
}

export interface OrgAnalyticsStorage {
  totalUsedBytes: number;
  totalReservedBytes: number;
  maxStorageBytes: number | null;
  percentUsed: number;
  storageByWorkspace: WorkspaceStorageEntry[];
  topWorkspacesByStorage: WorkspaceStorageEntry[];
  warnings: string[];
  timestamp: string;
}

export interface OrgAnalyticsScenarios {
  scenarioCountTotal: number;
  scenarioCountLast30Days: number;
  computeRunsLast30Days: number;
  topScenarioWorkspaces: Array<{ workspaceId: string; scenarioCount: number }>;
  warnings: string[];
  timestamp: string;
}

export interface OrgAnalyticsAudit {
  auditEventsLast30Days: number;
  auditByAction: Array<{ action: string; count: number }>;
  auditByWorkspace: Array<{ workspaceId: string; count: number }>;
  warnings: string[];
  timestamp: string;
}

export const orgDashboardApi = {
  async getOrgAnalyticsSummary(): Promise<OrgAnalyticsSummary> {
    const result: any = await api.get('/org/analytics/summary');
    return result?.data ?? result;
  },

  async getOrgAnalyticsCapacity(): Promise<OrgAnalyticsCapacity> {
    const result: any = await api.get('/org/analytics/capacity');
    return result?.data ?? result;
  },

  async getOrgAnalyticsStorage(): Promise<OrgAnalyticsStorage> {
    const result: any = await api.get('/org/analytics/storage');
    return result?.data ?? result;
  },

  async getOrgAnalyticsScenarios(): Promise<OrgAnalyticsScenarios> {
    const result: any = await api.get('/org/analytics/scenarios');
    return result?.data ?? result;
  },

  async getOrgAnalyticsAudit(): Promise<OrgAnalyticsAudit> {
    const result: any = await api.get('/org/analytics/audit');
    return result?.data ?? result;
  },
};
