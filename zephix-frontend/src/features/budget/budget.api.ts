// ─────────────────────────────────────────────────────────────────────────────
// Budget API Client — Sprint 5
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from '@/lib/api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BudgetBaselineStatus = 'DRAFT' | 'APPROVED' | 'SUPERSEDED';
export type BudgetForecastStatus = 'ON_TRACK' | 'WATCH' | 'AT_RISK' | 'CRITICAL';

export interface BudgetBaseline {
  id: string;
  projectId: string;
  baselineTotal: number;
  baselineByCategory: Record<string, number>;
  status: BudgetBaselineStatus;
  versionNumber: number;
  baselineApprovedBy: string | null;
  baselineApprovedAt: string | null;
  supersededAt: string | null;
  supersededByUserId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ActualCost {
  id: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  actualTotal: number;
  actualByCategory: Record<string, number>;
  source: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EarnedValueMetrics {
  bac: number;
  ac: number;
  ev: number;
  eac: number;
  etc: number;
  cpi: number | null;
  spi: number | null;
  forecastStatus: BudgetForecastStatus;
}

export interface BudgetSummary {
  baseline: BudgetBaseline | null;
  actuals: ActualCost[];
  totalActual: number;
  varianceTotal: number;
  variancePercent: number | null;
  ev: EarnedValueMetrics | null;
}

export interface BudgetHistory {
  baselines: BudgetBaseline[];
  actuals: ActualCost[];
}

export interface BudgetForecastingPolicy {
  eacFormula: 'AC_PLUS_REMAINING' | 'CPI_BASED';
  spiEnabled: boolean;
  forecastUpdateFrequencyDays: number;
}

export interface BudgetThresholdPolicy {
  costVarianceWarnPercent: number;
  costVarianceBlockPercent: number;
  forecastOverrunWarnPercent: number;
  forecastOverrunBlockPercent: number;
}

export type CostDerivationMode = 'MANUAL_ONLY' | 'HYBRID' | 'AUTO';

export interface CostDerivationPolicy {
  mode: CostDerivationMode;
  defaultHoursPerWeek: number;
  costFallbackBehavior: 'SKIP' | 'USE_ZERO';
}

export interface WeekAllocationDetail {
  userId: string;
  allocationPercent: number;
  availabilityPercent: number;
  effectiveHours: number;
  costPerHour: number;
  lineCost: number;
  rateSource: 'allocation_override' | 'resource_default' | 'fallback_zero';
}

export interface WeeklyCostSlice {
  weekStart: string;
  weekEnd: string;
  allocations: WeekAllocationDetail[];
  totalHours: number;
  totalCost: number;
}

export interface DerivedCostSuggestion {
  projectId: string;
  periodStart: string;
  periodEnd: string;
  derivedTotal: number;
  weeklyBreakdown: WeeklyCostSlice[];
  allocationsUsed: number;
  skippedNoRate: number;
  policy: CostDerivationPolicy;
}

export interface EffectiveBudgetPolicy {
  forecastingRules: BudgetForecastingPolicy;
  thresholdRules: BudgetThresholdPolicy;
  costDerivationRules: CostDerivationPolicy | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getBudgetSummary(
  projectId: string,
): Promise<BudgetSummary> {
  const res = await apiClient.get(`/work/projects/${projectId}/budgets`);
  return unwrap<BudgetSummary>(res);
}

export async function createBaseline(
  projectId: string,
  data: {
    baselineTotal: number;
    baselineByCategory?: Record<string, number>;
  },
): Promise<BudgetBaseline> {
  const res = await apiClient.post(
    `/work/projects/${projectId}/budgets/baselines`,
    { ...data, projectId },
  );
  return unwrap<BudgetBaseline>(res);
}

export async function updateBaseline(
  baselineId: string,
  data: {
    baselineTotal?: number;
    baselineByCategory?: Record<string, number>;
  },
): Promise<BudgetBaseline> {
  const res = await apiClient.patch(
    `/work/budgets/baselines/${baselineId}`,
    data,
  );
  return unwrap<BudgetBaseline>(res);
}

export async function approveBaseline(
  baselineId: string,
): Promise<BudgetBaseline> {
  const res = await apiClient.post(
    `/work/budgets/baselines/${baselineId}/approve`,
  );
  return unwrap<BudgetBaseline>(res);
}

export async function addActual(
  projectId: string,
  data: {
    periodStart: string;
    periodEnd: string;
    actualTotal: number;
    actualByCategory?: Record<string, number>;
  },
): Promise<ActualCost> {
  const res = await apiClient.post(
    `/work/projects/${projectId}/budgets/actuals`,
    { ...data, projectId },
  );
  return unwrap<ActualCost>(res);
}

export async function updateActual(
  actualId: string,
  data: {
    periodStart?: string;
    periodEnd?: string;
    actualTotal?: number;
    actualByCategory?: Record<string, number>;
  },
): Promise<ActualCost> {
  const res = await apiClient.patch(
    `/work/budgets/actuals/${actualId}`,
    data,
  );
  return unwrap<ActualCost>(res);
}

export async function deleteActual(actualId: string): Promise<void> {
  await apiClient.delete(`/work/budgets/actuals/${actualId}`);
}

export async function getBudgetHistory(
  projectId: string,
): Promise<BudgetHistory> {
  const res = await apiClient.get(
    `/work/projects/${projectId}/budgets/history`,
  );
  return unwrap<BudgetHistory>(res);
}

export async function getEffectiveBudgetPolicy(
  projectId?: string,
): Promise<EffectiveBudgetPolicy> {
  const params = projectId ? `?projectId=${projectId}` : '';
  const res = await apiClient.get(`/work/budgets/policy${params}`);
  return unwrap<EffectiveBudgetPolicy>(res);
}

export interface CostSuggestionComparison {
  existingActualTotal: number;
  derivedTotal: number;
  delta: number;
  deltaDirection: 'UNDER_REPORTED' | 'OVER_REPORTED' | 'ALIGNED';
}

export interface CostSuggestionResponse {
  available: boolean;
  suggestion?: DerivedCostSuggestion;
  comparison?: CostSuggestionComparison;
  reason?: string;
}

export async function getCostSuggestion(
  projectId: string,
  periodStart: string,
  periodEnd: string,
): Promise<CostSuggestionResponse> {
  const res = await apiClient.get(
    `/work/projects/${projectId}/budgets/cost-suggestion?periodStart=${periodStart}&periodEnd=${periodEnd}`,
  );
  return unwrap<CostSuggestionResponse>(res);
}
