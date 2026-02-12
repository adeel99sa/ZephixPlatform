// Phase 4.0: Workspace Rollup Widget — reads from /work/workspaces/:id/rollups
import { useEffect, useState } from 'react';

import type { WidgetBaseProps, WidgetError } from './types';

import type { WorkspaceRollupResponse } from '@/features/portfolio-rollups/types';
import { getWorkspaceRollup } from '@/features/portfolio-rollups/rollups.api';
import { useWorkspaceStore } from '@/state/workspace.store';

export function WorkspaceRollupWidget({ widget }: WidgetBaseProps) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<WidgetError | null>(null);
  const [data, setData] = useState<WorkspaceRollupResponse | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getWorkspaceRollup(activeWorkspaceId)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError({ message: err?.message || 'Failed to load rollup' });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Workspace Rollup</h3>
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 border border-red-200 rounded-lg bg-red-50"
        data-testid={`widget-${widget.id}`}
      >
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Workspace Rollup</h3>
        <p className="text-sm text-red-800">Widget data unavailable</p>
        <p className="text-xs text-red-600 mt-1">{error.message}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Workspace Rollup</h3>
        <p className="text-sm text-gray-500">No workspace selected</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg" data-testid={`widget-${widget.id}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        {widget.title || 'Workspace Rollup'}
      </h3>

      {/* Row 1: Totals */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCell label="Projects" value={data.totals.projectsCount} />
        <StatCell label="Portfolios" value={data.totals.portfoliosCount} />
        <StatCell label="Programs" value={data.totals.programsCount} />
      </div>

      {/* Row 2: Execution */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCell
          label="Active Phases"
          value={data.execution.phases.activeCount}
        />
        <StatCell
          label="Tasks Done"
          value={data.execution.tasks.doneCount}
          suffix={`/ ${data.execution.tasks.totalCount}`}
        />
        <StatCell
          label="Overdue"
          value={data.execution.tasks.overdueCount}
          color={data.execution.tasks.overdueCount > 0 ? 'text-red-600' : undefined}
        />
      </div>

      {/* Row 3: Risk + Governance */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCell
          label="Open Risks"
          value={data.risk.openRisks}
          color={data.risk.highRisks > 0 ? 'text-orange-600' : undefined}
        />
        <StatCell
          label="High/Critical"
          value={data.risk.highRisks}
          color={data.risk.highRisks > 0 ? 'text-red-600' : undefined}
        />
        {data.governance.phaseGates.enabled ? (
          <StatCell
            label="Gates Blocked"
            value={data.governance.phaseGates.phasesBlockedCount}
            color={
              data.governance.phaseGates.phasesBlockedCount > 0
                ? 'text-red-600'
                : undefined
            }
          />
        ) : (
          <StatCell label="Gates" value="Off" />
        )}
      </div>

      {/* Row 4: Budget + Resources */}
      <div className="grid grid-cols-3 gap-4">
        <StatCell
          label="Budget"
          value={formatCurrency(data.budget.totalBudget)}
        />
        <StatCell
          label="Variance"
          value={formatCurrency(data.budget.varianceTotal)}
          color={data.budget.varianceTotal < 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCell label="Allocations" value={data.resources.allocationsCount} />
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  color?: string;
}) {
  return (
    <div>
      <div className={`text-2xl font-bold ${color || 'text-gray-900'}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
      </div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}

function formatCurrency(n: number): string {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
