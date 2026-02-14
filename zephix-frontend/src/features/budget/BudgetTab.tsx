// ─────────────────────────────────────────────────────────────────────────────
// Budget Tab — Sprint 5
//
// Baseline CRUD (versioned), actuals CRUD, EV metrics, forecast status,
// policy thresholds display.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
  DollarSign,
  Plus,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  Trash2,
  Info,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getBudgetSummary,
  createBaseline,
  updateBaseline,
  approveBaseline,
  addActual,
  updateActual,
  deleteActual,
  getEffectiveBudgetPolicy,
  getCostSuggestion,
  type BudgetSummary,
  type EffectiveBudgetPolicy,
  type BudgetForecastStatus,
  type DerivedCostSuggestion,
} from './budget.api';
import { useAuth } from '@/state/AuthContext';

interface Props {
  projectId: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDec(n: number | null, decimals = 2): string {
  if (n == null) return '—';
  return n.toFixed(decimals);
}

const FORECAST_STATUS_CONFIG: Record<
  BudgetForecastStatus,
  { label: string; bg: string; text: string }
> = {
  ON_TRACK: { label: 'On Track', bg: 'bg-green-50', text: 'text-green-700' },
  WATCH: { label: 'Watch', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  AT_RISK: { label: 'At Risk', bg: 'bg-orange-50', text: 'text-orange-700' },
  CRITICAL: { label: 'Critical', bg: 'bg-red-50', text: 'text-red-700' },
};

export function BudgetTab({ projectId }: Props) {
  const { user } = useAuth();
  const isAdmin =
    user?.platformRole === 'ADMIN' ||
    (user?.platformRole as string) === 'OWNER' ||
    (user?.platformRole as string) === 'admin' ||
    (user?.platformRole as string) === 'owner';

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [policy, setPolicy] = useState<EffectiveBudgetPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showActual, setShowActual] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [editingActualId, setEditingActualId] = useState<string | null>(null);
  const [costSuggestion, setCostSuggestion] = useState<DerivedCostSuggestion | null>(null);
  const [costComparison, setCostComparison] = useState<{
    existingActualTotal: number;
    derivedTotal: number;
    delta: number;
    deltaDirection: 'UNDER_REPORTED' | 'OVER_REPORTED' | 'ALIGNED';
  } | null>(null);
  const [loadingCost, setLoadingCost] = useState(false);

  // Form state
  const [baselineTotal, setBaselineTotal] = useState('');
  const [actualTotal, setActualTotal] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [data, policyData] = await Promise.all([
        getBudgetSummary(projectId),
        getEffectiveBudgetPolicy(projectId).catch(() => null),
      ]);
      setSummary(data);
      setPolicy(policyData);
    } catch {
      toast.error('Failed to load budget');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLoadCostSuggestion = useCallback(async () => {
    if (!policy?.costDerivationRules || policy.costDerivationRules.mode === 'MANUAL_ONLY') return;
    setLoadingCost(true);
    try {
      // Default to current quarter
      const now = new Date();
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);
      const result = await getCostSuggestion(
        projectId,
        qStart.toISOString().split('T')[0],
        qEnd.toISOString().split('T')[0],
      );
      if (result.available && result.suggestion) {
        setCostSuggestion(result.suggestion);
        if (result.comparison) {
          setCostComparison(result.comparison);
        }
      }
    } catch {
      // Fail-open: cost suggestion is optional
    } finally {
      setLoadingCost(false);
    }
  }, [projectId, policy]);

  useEffect(() => {
    if (policy?.costDerivationRules && policy.costDerivationRules.mode !== 'MANUAL_ONLY') {
      void handleLoadCostSuggestion();
    }
  }, [handleLoadCostSuggestion, policy]);

  // ─── Handlers ──────────────────────────────────────────────

  const handleCreateBaseline = async () => {
    const total = parseFloat(baselineTotal);
    if (isNaN(total) || total <= 0) return;
    setBusy(true);
    try {
      await createBaseline(projectId, { baselineTotal: total });
      toast.success('Budget baseline created');
      setShowBaseline(false);
      setBaselineTotal('');
      await load();
    } catch {
      toast.error('Failed to create baseline');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateBaseline = async () => {
    if (!summary?.baseline) return;
    const total = parseFloat(baselineTotal);
    if (isNaN(total) || total <= 0) return;
    setBusy(true);
    try {
      await updateBaseline(summary.baseline.id, { baselineTotal: total });
      toast.success('Baseline updated');
      setEditingBaseline(false);
      setBaselineTotal('');
      await load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Failed to update baseline',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!summary?.baseline) return;
    setBusy(true);
    try {
      await approveBaseline(summary.baseline.id);
      toast.success('Baseline approved');
      await load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Failed to approve baseline',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddActual = async () => {
    const total = parseFloat(actualTotal);
    if (isNaN(total) || total <= 0 || !periodStart || !periodEnd) return;
    setBusy(true);
    try {
      await addActual(projectId, { periodStart, periodEnd, actualTotal: total });
      toast.success('Actual cost recorded');
      setShowActual(false);
      resetActualForm();
      await load();
    } catch {
      toast.error('Failed to record actual cost');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateActual = async () => {
    if (!editingActualId) return;
    const total = parseFloat(actualTotal);
    if (isNaN(total) || total <= 0) return;
    setBusy(true);
    try {
      await updateActual(editingActualId, {
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        actualTotal: total,
      });
      toast.success('Actual cost updated');
      setEditingActualId(null);
      resetActualForm();
      await load();
    } catch {
      toast.error('Failed to update actual cost');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteActual = async (actualId: string) => {
    if (!confirm('Delete this actual cost entry?')) return;
    setBusy(true);
    try {
      await deleteActual(actualId);
      toast.success('Actual cost deleted');
      await load();
    } catch {
      toast.error('Failed to delete actual cost');
    } finally {
      setBusy(false);
    }
  };

  const resetActualForm = () => {
    setActualTotal('');
    setPeriodStart('');
    setPeriodEnd('');
  };

  const startEditActual = (a: { id: string; periodStart: string; periodEnd: string; actualTotal: number }) => {
    setEditingActualId(a.id);
    setActualTotal(String(a.actualTotal));
    setPeriodStart(a.periodStart);
    setPeriodEnd(a.periodEnd);
  };

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const baseline = summary?.baseline;
  const variance = summary?.varianceTotal ?? 0;
  const variancePct = summary?.variancePercent;
  const ev = summary?.ev;

  return (
    <div className="space-y-6" data-testid="budget-tab">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Budget Overview
        </h3>
        <div className="flex gap-2 items-center">
          {/* Policy info toggle */}
          <button
            onClick={() => setShowPolicy(!showPolicy)}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-50"
            title="Policy thresholds in effect"
          >
            <Info className="h-3 w-3" /> Policy
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setShowBaseline(!showBaseline)}
                className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                <DollarSign className="h-3.5 w-3.5" />{' '}
                {baseline ? 'New Revision' : 'Set Baseline'}
              </button>
              <button
                onClick={() => setShowActual(!showActual)}
                className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" /> Record Actual
              </button>
            </>
          )}
        </div>
      </div>

      {/* Policy thresholds panel */}
      {showPolicy && policy && (
        <div className="rounded-lg border bg-slate-50 p-4 text-xs space-y-2">
          <h4 className="font-semibold text-gray-700 flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" /> Policy Thresholds in Effect
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 font-medium">Forecasting</p>
              <p>Formula: {policy.forecastingRules.eacFormula}</p>
              <p>SPI Enabled: {policy.forecastingRules.spiEnabled ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Thresholds</p>
              <p>Cost Variance Warn: {policy.thresholdRules.costVarianceWarnPercent}%</p>
              <p>Cost Variance Block: {policy.thresholdRules.costVarianceBlockPercent}%</p>
              <p>Forecast Overrun Warn: {policy.thresholdRules.forecastOverrunWarnPercent}%</p>
              <p>Forecast Overrun Block: {policy.thresholdRules.forecastOverrunBlockPercent}%</p>
            </div>
            {policy.costDerivationRules && (
              <div>
                <p className="text-gray-500 font-medium">Cost Derivation</p>
                <p>Mode: {policy.costDerivationRules.mode}</p>
                <p>Hours/Week: {policy.costDerivationRules.defaultHoursPerWeek}</p>
                <p>No Rate: {policy.costDerivationRules.costFallbackBehavior}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Baseline card */}
      {baseline ? (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">
                Budget Baseline (v{baseline.versionNumber})
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {fmt(baseline.baselineTotal)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  baseline.status === 'APPROVED'
                    ? 'bg-green-100 text-green-700'
                    : baseline.status === 'SUPERSEDED'
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {baseline.status}
              </span>
              {isAdmin && baseline.status === 'DRAFT' && (
                <>
                  <button
                    onClick={() => {
                      setEditingBaseline(true);
                      setBaselineTotal(String(baseline.baselineTotal));
                    }}
                    className="rounded border p-1 text-gray-400 hover:text-gray-600"
                    title="Edit baseline"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Approve
                  </button>
                </>
              )}
            </div>
          </div>
          {Object.keys(baseline.baselineByCategory || {}).length > 0 && (
            <div className="mt-2 flex gap-3 text-xs text-gray-500">
              {Object.entries(baseline.baselineByCategory).map(
                ([cat, val]) => (
                  <span key={cat}>
                    {cat}: {fmt(val)}
                  </span>
                ),
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-gray-50 p-6 text-center">
          <DollarSign className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No budget baseline set</p>
        </div>
      )}

      {/* Variance display */}
      {baseline && (
        <div className="grid grid-cols-3 gap-4" data-testid="variance-display">
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">Total Actual</p>
            <p className="text-xl font-bold text-gray-900">
              {fmt(summary?.totalActual ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">Variance</p>
            <p
              className={`text-xl font-bold ${
                variance > 0
                  ? 'text-red-600'
                  : variance < 0
                    ? 'text-green-600'
                    : 'text-gray-900'
              }`}
            >
              {variance > 0 ? '+' : ''}
              {fmt(variance)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">Variance %</p>
            <div className="flex items-center justify-center gap-1">
              {variance > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : variance < 0 ? (
                <TrendingDown className="h-4 w-4 text-green-500" />
              ) : (
                <Minus className="h-4 w-4 text-gray-400" />
              )}
              <p
                className={`text-xl font-bold ${
                  variance > 0
                    ? 'text-red-600'
                    : variance < 0
                      ? 'text-green-600'
                      : 'text-gray-900'
                }`}
              >
                {variancePct != null ? `${variancePct}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EV Metrics Section */}
      {ev && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">
              Earned Value Metrics
            </h4>
            {ev.forecastStatus && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  FORECAST_STATUS_CONFIG[ev.forecastStatus]?.bg ?? 'bg-gray-50'
                } ${FORECAST_STATUS_CONFIG[ev.forecastStatus]?.text ?? 'text-gray-700'}`}
              >
                {FORECAST_STATUS_CONFIG[ev.forecastStatus]?.label ?? ev.forecastStatus}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3" data-testid="ev-metrics">
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase">BAC</p>
              <p className="text-sm font-bold text-gray-900">{fmt(ev.bac)}</p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase">EV</p>
              <p className="text-sm font-bold text-gray-900">{fmt(ev.ev)}</p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase">EAC</p>
              <p className="text-sm font-bold text-gray-900">{fmt(ev.eac)}</p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase">ETC</p>
              <p className="text-sm font-bold text-gray-900">{fmt(ev.etc)}</p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase">CPI</p>
              <p className={`text-sm font-bold ${
                ev.cpi != null && ev.cpi < 1 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {fmtDec(ev.cpi, 4)}
              </p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase">SPI</p>
              <p className={`text-sm font-bold ${
                ev.spi != null && ev.spi < 1 ? 'text-orange-600' : 'text-gray-900'
              }`}>
                {fmtDec(ev.spi, 4)}
              </p>
            </div>
            <div className="rounded-lg border bg-white p-3 text-center col-span-2">
              <p className="text-[10px] text-gray-500 uppercase">AC</p>
              <p className="text-sm font-bold text-gray-900">{fmt(ev.ac)}</p>
            </div>
          </div>
          {/* Forecast warning */}
          {(ev.forecastStatus === 'AT_RISK' || ev.forecastStatus === 'CRITICAL') && (
            <div className="flex items-start gap-2 rounded-lg border-l-4 border-orange-400 bg-orange-50 p-3 text-xs text-orange-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">
                  Forecast {ev.forecastStatus === 'CRITICAL' ? 'critical' : 'at risk'}
                </p>
                <p>
                  EAC ({fmt(ev.eac)}) exceeds BAC ({fmt(ev.bac)}) by{' '}
                  {ev.bac > 0 ? `${(((ev.eac - ev.bac) / ev.bac) * 100).toFixed(1)}%` : '—'}.
                  {policy ? ` Policy block threshold: ${policy.thresholdRules.forecastOverrunBlockPercent}%.` : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cost Derivation Suggestion (Sprint 6) */}
      {policy?.costDerivationRules && policy.costDerivationRules.mode !== 'MANUAL_ONLY' && (
        <div className="border rounded-lg bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">
              Resource Cost Derivation
            </h4>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              Mode: {policy.costDerivationRules.mode}
            </span>
          </div>
          {loadingCost ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Computing cost suggestion...
            </div>
          ) : costSuggestion ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="bg-blue-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-500">Derived Total</div>
                  <div className="font-semibold text-blue-700">
                    {fmt(costSuggestion.derivedTotal)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-500">Period</div>
                  <div className="font-medium text-gray-700 text-xs">
                    {costSuggestion.periodStart} — {costSuggestion.periodEnd}
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-500">Allocations</div>
                  <div className="font-medium text-gray-700">
                    {costSuggestion.allocationsUsed}
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-500">Skipped (no rate)</div>
                  <div className={`font-medium ${costSuggestion.skippedNoRate > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
                    {costSuggestion.skippedNoRate}
                  </div>
                </div>
              </div>
              {costSuggestion.weeklyBreakdown.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                    Weekly breakdown ({costSuggestion.weeklyBreakdown.length} weeks)
                  </summary>
                  <div className="mt-2 border rounded divide-y max-h-48 overflow-y-auto">
                    {costSuggestion.weeklyBreakdown.map((w) => (
                      <div key={w.weekStart} className="flex justify-between px-3 py-1.5">
                        <span className="text-gray-600">{w.weekStart}</span>
                        <span className="text-gray-500">{w.totalHours.toFixed(1)} hrs</span>
                        <span className="font-medium">{fmt(w.totalCost)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {/* Delta comparison: derived vs existing actuals */}
              {costComparison && costComparison.derivedTotal > 0 && (
                <div className="bg-gray-50 rounded p-3 space-y-1 text-sm">
                  <div className="font-medium text-gray-700 text-xs mb-2">Derived vs Actual Comparison</div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Derived suggestion</span>
                    <span className="font-medium">{fmt(costComparison.derivedTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Existing actuals (period)</span>
                    <span className="font-medium">{fmt(costComparison.existingActualTotal)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-gray-600 font-medium">Delta</span>
                    <span className={`font-semibold ${
                      costComparison.deltaDirection === 'ALIGNED'
                        ? 'text-green-700'
                        : costComparison.deltaDirection === 'UNDER_REPORTED'
                          ? 'text-amber-600'
                          : 'text-blue-600'
                    }`}>
                      {costComparison.delta > 0 ? '+' : ''}{fmt(costComparison.delta)}
                      <span className="ml-1 text-xs font-normal">
                        ({costComparison.deltaDirection === 'ALIGNED'
                          ? 'aligned'
                          : costComparison.deltaDirection === 'UNDER_REPORTED'
                            ? 'actuals may be under-reported'
                            : 'actuals exceed derived estimate'
                        })
                      </span>
                    </span>
                  </div>
                </div>
              )}
              {policy.costDerivationRules.mode === 'HYBRID' && costSuggestion.derivedTotal > 0 && (
                <p className="text-xs text-gray-500 italic">
                  HYBRID mode: This is a suggestion. Add actuals manually to override.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No allocations with cost rates found for this period.
            </p>
          )}
        </div>
      )}

      {/* Actual cost entries */}
      {(summary?.actuals?.length ?? 0) > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Actual Cost Entries
          </h4>
          <div className="divide-y border rounded-lg bg-white">
            {summary!.actuals.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                {editingActualId === a.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="rounded border px-2 py-1 text-xs"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="rounded border px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      value={actualTotal}
                      onChange={(e) => setActualTotal(e.target.value)}
                      className="w-28 rounded border px-2 py-1 text-xs"
                    />
                    <button
                      onClick={handleUpdateActual}
                      disabled={busy}
                      className="rounded bg-indigo-600 px-2 py-1 text-[10px] text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingActualId(null);
                        resetActualForm();
                      }}
                      className="text-[10px] text-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-gray-600">
                      {a.periodStart} to {a.periodEnd}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {fmt(a.actualTotal)}
                      </span>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => startEditActual(a)}
                            className="rounded border p-1 text-gray-400 hover:text-gray-600"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteActual(a.id)}
                            className="rounded border p-1 text-gray-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit baseline form */}
      {editingBaseline && (
        <div className="border rounded-lg p-4 bg-white space-y-3">
          <h4 className="text-sm font-medium">Edit Draft Baseline</h4>
          <input
            type="number"
            value={baselineTotal}
            onChange={(e) => setBaselineTotal(e.target.value)}
            placeholder="Total budget amount"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpdateBaseline}
              disabled={busy}
              className="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingBaseline(false);
                setBaselineTotal('');
              }}
              className="text-xs text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create baseline form */}
      {showBaseline && !editingBaseline && (
        <div className="border rounded-lg p-4 bg-white space-y-3">
          <h4 className="text-sm font-medium">
            {baseline ? 'New Baseline Revision' : 'New Budget Baseline'}
          </h4>
          <input
            type="number"
            value={baselineTotal}
            onChange={(e) => setBaselineTotal(e.target.value)}
            placeholder="Total budget amount"
            className="w-full rounded border px-3 py-2 text-sm"
            data-testid="baseline-total-input"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateBaseline}
              disabled={busy}
              className="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create Draft
            </button>
            <button
              onClick={() => setShowBaseline(false)}
              className="text-xs text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add actual form */}
      {showActual && (
        <div className="border rounded-lg p-4 bg-white space-y-3">
          <h4 className="text-sm font-medium">Record Actual Cost</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <input
            type="number"
            value={actualTotal}
            onChange={(e) => setActualTotal(e.target.value)}
            placeholder="Actual cost amount"
            className="w-full rounded border px-3 py-2 text-sm"
            data-testid="actual-total-input"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddActual}
              disabled={busy}
              className="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Record
            </button>
            <button
              onClick={() => setShowActual(false)}
              className="text-xs text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
