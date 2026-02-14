/**
 * Budget Summary Panel — C2 Budget & Cost Lite
 *
 * Shows planned vs actual vs forecast for a project.
 * Only renders when cost tracking is enabled.
 * Hidden for guests.
 */

import { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Target } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { canSeeCost } from '@/utils/access';

interface CostSummary {
  projectId: string;
  budgetAmount: number | null;
  currency: string;
  rate: number;
  costTrackingEnabled: boolean;
  plannedHours: number;
  actualHours: number;
  remainingHours: number;
  plannedCost: number;
  actualCost: number;
  costVariance: number;
  forecastAtCompletion: number;
}

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

function fmt(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function BudgetSummaryPanel({ projectId }: { projectId: string }) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { user } = useAuth();
  // Phase 2A fix: use canSeeCost instead of broken isGuest from useWorkspaceRole
  const costVisible = canSeeCost(null, user?.platformRole ?? user?.role);
  const [data, setData] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspaceId || !costVisible) {
      setLoading(false);
      return;
    }
    apiClient
      .get(`/work/projects/${projectId}/cost-summary`, {
        headers: { 'x-workspace-id': activeWorkspaceId },
      })
      .then((res) => setData(unwrap<CostSummary>(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, activeWorkspaceId, costVisible]);

  // Don't render for guests or if cost tracking disabled
  if (!costVisible || loading || !data || !data.costTrackingEnabled) return null;

  const overBudget =
    data.budgetAmount != null && data.forecastAtCompletion > data.budgetAmount;
  const variancePositive = data.costVariance >= 0;

  return (
    <div
      className="rounded-lg border bg-white p-4 space-y-3"
      data-testid="budget-summary-panel"
    >
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">
          Budget & Cost
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.budgetAmount != null && (
          <div className="rounded border p-2">
            <p className="text-[10px] text-gray-500 uppercase">Budget</p>
            <p className="text-base font-bold text-gray-900">
              {fmt(data.budgetAmount, data.currency)}
            </p>
          </div>
        )}
        <div className="rounded border p-2">
          <p className="text-[10px] text-gray-500 uppercase">Planned Cost</p>
          <p className="text-base font-bold text-indigo-600">
            {fmt(data.plannedCost, data.currency)}
          </p>
        </div>
        <div className="rounded border p-2">
          <p className="text-[10px] text-gray-500 uppercase">Actual Cost</p>
          <p className="text-base font-bold text-gray-900">
            {fmt(data.actualCost, data.currency)}
          </p>
        </div>
        <div className="rounded border p-2">
          <p className="text-[10px] text-gray-500 uppercase">Forecast</p>
          <p
            className={`text-base font-bold ${overBudget ? 'text-red-600' : 'text-green-600'}`}
          >
            {fmt(data.forecastAtCompletion, data.currency)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          {variancePositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          )}
          <span
            className={variancePositive ? 'text-green-700' : 'text-red-700'}
          >
            Variance: {fmt(data.costVariance, data.currency)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <Target className="h-3.5 w-3.5" />
          <span>
            {data.actualHours.toFixed(1)}h actual / {data.plannedHours.toFixed(1)}h
            planned
          </span>
        </div>
      </div>

      <div className="text-[10px] text-gray-400">
        Rate: {fmt(data.rate, data.currency)}/hr
      </div>
    </div>
  );
}
