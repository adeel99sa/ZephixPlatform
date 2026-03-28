/**
 * Phase 2B: Earned Value panel for project overview.
 * Shows PV, EV, AC, CPI, SPI, EAC, ETC, VAC.
 * Only visible to workspace_owner or platform admin
 * when earnedValueEnabled is true.
 */
import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isPlatformAdmin } from '@/utils/access';
import { getEarnedValue, createEVSnapshot, type EarnedValueData } from '@/features/work-management/schedule.api';
import { TrendingUp, Camera, AlertCircle } from 'lucide-react';

interface Props {
  projectId: string;
  earnedValueEnabled: boolean;
  workspaceRole?: string;
}

const fmtCurrency = (v: number | null) =>
  v != null ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';
const fmtRatio = (v: number | null) =>
  v != null ? v.toFixed(2) : '—';

export const EarnedValuePanel: React.FC<Props> = ({
  projectId,
  earnedValueEnabled,
  workspaceRole,
}) => {
  const { user } = useAuth();
  const canView =
    isPlatformAdmin(user) ||
    workspaceRole === 'workspace_owner' ||
    workspaceRole === 'delivery_owner';

  const [data, setData] = useState<EarnedValueData | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEarnedValue(projectId, asOfDate);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to compute earned value');
    } finally {
      setLoading(false);
    }
  }, [projectId, asOfDate]);

  const handleSnapshot = async () => {
    setSnapping(true);
    try {
      await createEVSnapshot(projectId, { asOfDate });
      // Recompute to show snapshot id
      await compute();
    } catch {
      // silent
    } finally {
      setSnapping(false);
    }
  };

  if (!earnedValueEnabled || !canView) return null;

  const cpiColor = (v: number | null) =>
    v == null ? 'text-slate-500' : v >= 1 ? 'text-green-600' : 'text-red-600';
  const spiColor = cpiColor;

  return (
    <div className="bg-white rounded-lg border p-6" data-testid="earned-value-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Earned Value
        </h3>
      </div>

      {/* Date selector and compute */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={compute}
          disabled={loading}
          className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Computing...' : 'Compute'}
        </button>
        {data && (
          <button
            onClick={handleSnapshot}
            disabled={snapping}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
            {snapping ? 'Saving...' : 'Snapshot'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-3 gap-4">
          {/* Row 1: PV, EV, AC */}
          <MetricCard label="PV (Planned)" value={fmtCurrency(data.pv)} />
          <MetricCard label="EV (Earned)" value={fmtCurrency(data.ev)} />
          <MetricCard label="AC (Actual)" value={fmtCurrency(data.ac)} />

          {/* Row 2: CPI, SPI, BAC */}
          <MetricCard label="CPI" value={fmtRatio(data.cpi)} className={cpiColor(data.cpi)} />
          <MetricCard label="SPI" value={fmtRatio(data.spi)} className={spiColor(data.spi)} />
          <MetricCard label="BAC (Budget)" value={fmtCurrency(data.bac)} />

          {/* Row 3: EAC, ETC, VAC */}
          <MetricCard label="EAC (Est. at Completion)" value={fmtCurrency(data.eac)} />
          <MetricCard label="ETC (Est. to Complete)" value={fmtCurrency(data.etc)} />
          <MetricCard
            label="VAC (Variance)"
            value={fmtCurrency(data.vac)}
            className={data.vac != null ? (data.vac >= 0 ? 'text-green-600' : 'text-red-600') : ''}
          />
        </div>
      )}

      {!data && !loading && !error && (
        <p className="text-sm text-slate-500">
          Select a date and click Compute to calculate earned value metrics.
        </p>
      )}
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  className?: string;
}> = ({ label, value, className = '' }) => (
  <div className="bg-slate-50 rounded-lg p-3 text-center">
    <p className={`text-lg font-bold ${className || 'text-slate-900'}`}>{value}</p>
    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
  </div>
);
