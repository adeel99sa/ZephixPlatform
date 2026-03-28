// ─────────────────────────────────────────────────────────────────────────────
// AdminBetaHealthPage — Step 25 PM Beta Execution Framework
//
// War room dashboard: beta workspaces, event counts, feedback, errors.
// No charts. Structured lists only. Admin-only.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import {
  Activity, MessageSquare, AlertTriangle, Server,
  RefreshCw, Clock, ShieldCheck, Zap
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BetaWorkspace {
  id: string;
  name: string;
  betaTier: string;
  isDemo: boolean;
  createdAt: string;
}

interface TopFeedback {
  id: string;
  surface: string;
  severity: string;
  feedbackType: string;
  message: string;
  createdAt: string;
  status: string;
}

interface TopErrorEndpoint {
  endpoint: string;
  count: number;
}

interface BetaHealth {
  betaWorkspaces: BetaWorkspace[];
  totalEventCount: number;
  totalFeedbackCount: number;
  totalErrorCount: number;
  topFeedback: TopFeedback[];
  topErrorEndpoints: TopErrorEndpoint[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const severityColor: Record<string, string> = {
  BLOCKER: 'bg-red-100 text-red-800',
  HIGH: 'bg-amber-100 text-amber-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  LOW: 'bg-slate-100 text-slate-700',
};

const statusColor: Record<string, string> = {
  OPEN: 'bg-amber-50 text-amber-700 border-amber-200',
  ACKNOWLEDGED: 'bg-blue-50 text-blue-700 border-blue-200',
  FIXED: 'bg-green-50 text-green-700 border-green-200',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminBetaHealthPage() {
  const [data, setData] = useState<BetaHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/admin/beta/health') as any;
      setData(res.data ?? res);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load beta health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-slate-500">Loading beta health data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Beta Health Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Observability for controlled beta exposure</p>
        </div>
        <button
          onClick={load}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={Server}
              label="Beta Workspaces"
              value={data.betaWorkspaces.length}
              sub={`${data.betaWorkspaces.filter(w => w.isDemo).length} demo`}
            />
            <SummaryCard
              icon={Activity}
              label="Total Events"
              value={data.totalEventCount}
            />
            <SummaryCard
              icon={MessageSquare}
              label="Feedback Items"
              value={data.totalFeedbackCount}
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Errors Captured"
              value={data.totalErrorCount}
              danger={data.totalErrorCount > 50}
            />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Beta Workspaces */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Active Beta Workspaces</h2>
              {data.betaWorkspaces.length === 0 ? (
                <p className="text-sm text-slate-400">No beta workspaces configured yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.betaWorkspaces.map((ws) => (
                    <div key={ws.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <span className="text-sm text-slate-700">{ws.name}</span>
                        {ws.isDemo && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Demo</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{ws.betaTier ?? 'CORE'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Error Endpoints */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Top 5 Error Endpoints</h2>
              {data.topErrorEndpoints.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <ShieldCheck className="h-4 w-4" />
                  <span>No errors recorded yet.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.topErrorEndpoints.map((ep, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <code className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded truncate max-w-[280px]">{ep.endpoint}</code>
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">{ep.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Feedback Messages */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Top 5 Feedback Messages</h2>
            {data.topFeedback.length === 0 ? (
              <p className="text-sm text-slate-400">No feedback submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topFeedback.map((fb) => (
                  <div key={fb.id} className="p-3 rounded border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${severityColor[fb.severity] ?? severityColor.LOW}`}>
                        {fb.severity}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{fb.surface}</span>
                      <span className="text-xs text-slate-500">{fb.feedbackType}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${statusColor[fb.status] ?? statusColor.OPEN}`}>
                        {fb.status}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(fb.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{fb.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Summary Card ───────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  danger,
}: {
  icon: any;
  label: string;
  value: number;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${danger ? 'bg-red-50' : 'bg-blue-50'}`}>
          <Icon className={`h-5 w-5 ${danger ? 'text-red-600' : 'text-blue-600'}`} />
        </div>
        <div>
          <p className={`text-xl font-bold ${danger ? 'text-red-700' : 'text-slate-900'}`}>{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
