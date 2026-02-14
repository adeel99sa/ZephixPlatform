/**
 * Phase 4A+4C+4E: Organization Command Center
 *
 * Platform ADMIN only. Read-only executive analytics.
 * Summary cards + 2 tables + warning banner + loading/empty states.
 * 30-second client cache with manual refresh.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/state/AuthContext';
import { Navigate } from 'react-router-dom';
import { isPlatformAdmin } from '@/utils/access';
import {
  orgDashboardApi,
  OrgAnalyticsSummary,
  OrgAnalyticsStorage,
  OrgAnalyticsCapacity,
} from './orgDashboard.api';

/** Client-side cache TTL in milliseconds */
const CACHE_TTL_MS = 30_000;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function cpiColor(val: number | null): string {
  if (val === null) return 'text-gray-500';
  if (val >= 1) return 'text-green-600';
  if (val >= 0.9) return 'text-yellow-600';
  return 'text-red-600';
}

function formatLastUpdated(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// ─── Warning Banner ──────────────────────────────────────────

interface WarningBannerProps {
  warnings: string[];
}

export function WarningBanner({ warnings }: WarningBannerProps) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div
      className="rounded-lg border border-yellow-300 bg-yellow-50 p-4"
      data-testid="org-dashboard-warnings"
    >
      <p className="text-sm font-medium text-yellow-800">Capability Warnings</p>
      <ul className="mt-1 list-disc list-inside text-sm text-yellow-700">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6" data-testid="org-dashboard-loading">
      <h1 className="text-2xl font-semibold text-gray-900">Organization Command Center</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center"
      data-testid="org-dashboard-empty"
    >
      <p className="text-lg font-medium text-gray-600">No data yet</p>
      <p className="text-sm text-gray-500 mt-2">
        Your organization has no workspaces or projects. Create a workspace to start seeing analytics.
      </p>
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────

function ErrorState({ error }: { error: { code?: string; message: string } }) {
  return (
    <div className="p-6" data-testid="org-dashboard-error">
      <h1 className="text-2xl font-semibold text-gray-900">Organization Command Center</h1>
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">
          {error.code ? `[${error.code}] ` : ''}
          {error.message}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function OrgDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<OrgAnalyticsSummary | null>(null);
  const [storage, setStorage] = useState<OrgAnalyticsStorage | null>(null);
  const [capacity, setCapacity] = useState<OrgAnalyticsCapacity | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const lastFetchedAtRef = useRef<number>(0);

  const fetchData = useCallback(
    async (force = false) => {
      if (!user || !isPlatformAdmin(user)) return;

      // Skip if within cache TTL and not forced
      if (!force && Date.now() - lastFetchedAtRef.current < CACHE_TTL_MS && summary) {
        return;
      }

      // Distinguish initial load from subsequent refresh
      const isRefresh = summary !== null;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [s, st, c] = await Promise.all([
          orgDashboardApi.getOrgAnalyticsSummary(),
          orgDashboardApi.getOrgAnalyticsStorage(),
          orgDashboardApi.getOrgAnalyticsCapacity(),
        ]);
        setSummary(s);
        setStorage(st);
        setCapacity(c);
        lastFetchedAtRef.current = Date.now();
      } catch (err: any) {
        const code = err?.response?.data?.code || err?.code || undefined;
        const message =
          err?.response?.data?.message || err?.message || 'Failed to load analytics';
        setError({ code, message });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, summary],
  );

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Gate: no flash for non-admin
  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isPlatformAdmin(user)) return <Navigate to="/home" replace />;

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} />;

  // Collect all warnings from all DTOs
  const allWarnings: string[] = [
    ...(summary?.warnings ?? []),
    ...(storage?.warnings ?? []),
    ...(capacity?.warnings ?? []),
  ];

  // Empty state: no workspaces and no projects
  const isEmpty = (summary?.workspaceCount ?? 0) === 0 && (summary?.projectCount ?? 0) === 0;

  return (
    <div className="p-6 space-y-6" data-testid="org-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Organization Command Center</h1>
          {summary?.lastUpdatedAt && (
            <p className="text-xs text-gray-500 mt-1" data-testid="last-updated">
              Last updated: {formatLastUpdated(summary.lastUpdatedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="refresh-button"
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              refreshing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            {summary?.planCode?.toUpperCase()} — {summary?.planStatus}
          </span>
        </div>
      </div>

      {/* Warning Banner */}
      <WarningBanner warnings={allWarnings} />

      {/* Empty State */}
      {isEmpty && <EmptyState />}

      {/* Summary Cards */}
      {!isEmpty && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
            <SummaryCard label="Workspaces" value={summary?.workspaceCount ?? 0} />
            <SummaryCard label="Projects" value={summary?.projectCount ?? 0} />
            <SummaryCard label="At Risk" value={summary?.atRiskProjectsCount ?? 0} alert />
            <SummaryCard
              label="CPI"
              value={summary?.aggregateCPI !== null && summary?.aggregateCPI !== undefined ? summary.aggregateCPI.toFixed(2) : '—'}
              className={cpiColor(summary?.aggregateCPI ?? null)}
            />
            <SummaryCard
              label="SPI"
              value={summary?.aggregateSPI !== null && summary?.aggregateSPI !== undefined ? summary.aggregateSPI.toFixed(2) : '—'}
              className={cpiColor(summary?.aggregateSPI ?? null)}
            />
            <SummaryCard label="Portfolios" value={summary?.portfolioCount ?? 0} />
            <SummaryCard
              label="Storage Used"
              value={storage ? formatBytes(storage.totalUsedBytes) : '—'}
              sub={storage?.maxStorageBytes ? `${storage.percentUsed}% of ${formatBytes(storage.maxStorageBytes)}` : undefined}
            />
            <SummaryCard label="Overallocated Days" value={capacity?.overallocationDaysTotal ?? 0} alert />
          </div>

          {/* Table 1: Top Overallocated Users */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="overallocated-table">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Top Overallocated Users</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workspace</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overallocated Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peak Utilization</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(capacity?.topOverallocatedUsers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm text-gray-500 text-center">
                      No overallocated users
                    </td>
                  </tr>
                ) : (
                  capacity!.topOverallocatedUsers.map((u, idx) => (
                    <tr key={`${u.userId}-${u.workspaceId}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {u.userId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {u.workspaceId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                        {u.overallocatedDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(u.peakUtilization * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table 2: Storage by Workspace */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="storage-table">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Storage by Workspace</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workspace</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Used</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(storage?.topWorkspacesByStorage ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm text-gray-500 text-center">
                      No storage data
                    </td>
                  </tr>
                ) : (
                  storage!.topWorkspacesByStorage.map((ws, idx) => (
                    <tr key={`${ws.workspaceId}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {ws.workspaceId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatBytes(ws.usedBytes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatBytes(ws.reservedBytes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ws.percentUsed.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  alert,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className={`text-3xl font-semibold mt-2 ${alert ? 'text-red-600' : className || 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
