// Phase 4.3: Dashboard View with Global Filters and Widget Grid
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import { RefreshCw, Share2, Edit, Calendar, LogIn } from "lucide-react";
import { fetchDashboard, fetchDashboardPublic } from "@/features/dashboards/api";
import { useAuth } from "@/state/AuthContext";
import FiltersBar from "@/features/dashboards/FiltersBar";
import { parseFiltersFromUrl, filtersToUrl, type DashboardFilters } from "@/features/dashboards/filters";
import { WidgetRenderer } from "@/features/dashboards/widgets/WidgetRenderer";
import ShareDialog from "@/features/dashboards/ShareDialog";
import { track } from "@/lib/telemetry";
import type { DashboardEntity, SharedDashboardEntity } from "@/features/dashboards/types";
import { WorkspaceRequiredError } from "@/features/dashboards/schemas";
import {
  getWorkspaceDashboardSummary,
  getWorkspaceDocumentsSummary,
  getWorkspaceOpenRisks,
  getWorkspaceRecentProjects,
  getWorkspaceUpcomingMilestones,
} from "@/features/dashboards/workspaceDashboardData.api";

export default function DashboardView() {
  const params = useParams<{ id?: string; dashboardId?: string; workspaceId?: string }>();
  const id = params.id || params.dashboardId;
  const workspaceId = params.workspaceId;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const shareToken = searchParams.get('share');
  const isShareMode = !!shareToken && !user; // Share mode: has token but not signed in

  const [dashboard, setDashboard] = useState<DashboardEntity | SharedDashboardEntity | null>(null);
  const [widgetsData, setWidgetsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState(false);

  // Global filters state
  const urlFilters = useMemo(() => parseFiltersFromUrl(location.search), [location.search]);
  const [globalFilters, setGlobalFilters] = useState<DashboardFilters>(() => {
    // Initialize from URL or defaults
    const parsed = parseFiltersFromUrl(location.search);
    return parsed;
  });

  // Convert filters to date range for analytics widgets
  const dateRange = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);

    switch (globalFilters.timeRange) {
      case '7d':
        startDate.setDate(today.getDate() - 7);
        break;
      case '14d':
        startDate.setDate(today.getDate() - 14);
        break;
      case '30d':
        startDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'custom':
        if (globalFilters.from) {
          startDate.setTime(new Date(globalFilters.from).getTime());
        } else {
          startDate.setDate(today.getDate() - 30);
        }
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }

    const endDate = globalFilters.to ? new Date(globalFilters.to) : today;

    return {
      startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [globalFilters]);

  // Load dashboard
  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      setWorkspaceError(false);

      // Use public fetch if in share mode
      if (isShareMode && shareToken) {
        const d = await fetchDashboardPublic(id!, shareToken);
        setDashboard(d);
      } else {
        const d = await fetchDashboard(id!);
        setDashboard(d);
      }
    } catch (e: any) {
      if (e instanceof WorkspaceRequiredError) {
        setWorkspaceError(true);
        setError("Please select a workspace to view this dashboard.");
      } else {
        const requestId = e?.response?.headers?.['x-request-id'];
        setError(e?.response?.data?.message || `Failed to load dashboard${requestId ? ` (RequestId: ${requestId})` : ''}`);
        // Still render shell with fallback
        setDashboard({
          id: id!,
          name: "Dashboard",
          widgets: [],
          visibility: "WORKSPACE",
          workspaceId: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [id, shareToken, isShareMode]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // 2) Query workspace dashboard data when dashboard/filters are ready
  useEffect(() => {
    if (!dashboard || !workspaceId) return;
    const configuredWidgets =
      (dashboard as DashboardEntity).layoutConfig?.widgets || [];
    if (!configuredWidgets.length) {
      setWidgetsData({});
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const [
          summary,
          projects,
          milestones,
          risks,
          documents,
        ] = await Promise.all([
          getWorkspaceDashboardSummary(workspaceId),
          getWorkspaceRecentProjects(workspaceId),
          getWorkspaceUpcomingMilestones(workspaceId),
          getWorkspaceOpenRisks(workspaceId),
          getWorkspaceDocumentsSummary(workspaceId),
        ]);

        const merged: Record<string, any> = {};
        for (const widget of configuredWidgets) {
          switch (widget.type) {
            case 'recent_projects':
              merged[widget.id] = projects;
              break;
            case 'project_status_summary':
              merged[widget.id] = summary?.projectStatusSummary || {};
              break;
            case 'upcoming_milestones':
              merged[widget.id] = milestones;
              break;
            case 'open_risks':
              merged[widget.id] = risks;
              break;
            case 'documents_summary':
              merged[widget.id] = documents;
              break;
            default:
              merged[widget.id] = null;
          }
        }
        setWidgetsData(merged);
      } catch (e) {
        console.warn("Widget query failed", e);
        setWidgetsData({});
      }
    })();
    return () => controller.abort();
  }, [dashboard, workspaceId, urlFilters]);

  const onApplyFilters = (filters: DashboardFilters) => {
    setGlobalFilters(filters);
    const url = filtersToUrl(filters);
    navigate({ search: url }, { replace: true });
    track("ui.db.filters.apply", { id, filters });
  };

  const openShare = () => {
    setShareOpen(true);
    track("ui.db.share.open", { id });
  };

  const saveShare = async (visibility: 'PRIVATE'|'WORKSPACE'|'ORG') => {
    if (!dashboard) return;
    try {
      const updated = await fetchDashboard(id!);
      setDashboard({ ...updated, visibility });
    } catch (e) {
      console.error("Failed to update visibility", e);
    }
  };

  // Workspace required error handler
  if (workspaceError) {
    return (
      <div className="p-6" data-testid="dashboard-view">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Please select a workspace to view this dashboard.</p>
        </div>
      </div>
    );
  }

  const name = dashboard?.name ?? "Dashboard";
  const widgets = dashboard?.widgets ?? [];

  return (
    <div className="p-6 space-y-4" data-testid="dashboard-view">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="dashboard-title">
          {name}
        </h1>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <Calendar className="w-4 h-4 text-gray-400 mx-2" />
            <select
              value={globalFilters.timeRange}
              onChange={(e) => {
                const newFilters = { ...globalFilters, timeRange: e.target.value as any };
                onApplyFilters(newFilters);
              }}
              className="px-3 py-2 text-sm border-0 focus:ring-0 focus:outline-none rounded-md"
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            data-testid="dashboard-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Share Button - Hidden in share mode */}
          {!isShareMode && (
            <button
              data-testid="dashboard-share"
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={openShare}
            >
              <Share2 className="w-4 h-4 mr-2 inline" />
              Share
            </button>
          )}

          {/* Edit Button - Hidden in share mode */}
          {!isShareMode && (
            <Link
              to={`/workspaces/${workspaceId}/dashboard/${id}/edit`}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              data-testid="dashboard-edit"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          )}

          {/* Sign In Prompt in Share Mode */}
          {isShareMode && (
            <Link
              to="/login"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              data-testid="share-sign-in"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign in to load live data
            </Link>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <FiltersBar storageKey={`dash:${id}:filters`} onApply={onApplyFilters} />

      {/* Widgets Grid - Use stored layout */}
      <div data-testid="dashboard-widgets" className="grid grid-cols-12 gap-4">
        {loading && (
          <div className="col-span-12 animate-pulse space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-20 w-full bg-gray-200 rounded" />
          </div>
        )}

        {!loading && widgets.length === 0 && (
          <div className="col-span-12 text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">No widgets configured.</p>
            <Link
              to={`/workspaces/${workspaceId}/dashboard/${id}/edit`}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Add widgets
            </Link>
          </div>
        )}

        {!loading && widgets.map((w) => {
          // Use stored layout (x, y, w, h) for grid positioning
          const colSpan = w.layout?.w || 4;
          const rowSpan = w.layout?.h || 3;

          // Prepare filters for widget
          const widgetFilters = {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            projectId: globalFilters.owner, // Map owner filter to projectId if needed
            resourceId: undefined, // TODO: Add resource filter if needed
          };

          return (
            <div
              key={w.id}
              className={`col-span-${colSpan} row-span-${rowSpan}`}
              style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
              }}
            >
              <WidgetRenderer
                widget={w}
                data={widgetsData[w.id]}
                filters={widgetFilters}
                isShareMode={isShareMode}
              />
            </div>
          );
        })}
      </div>

      {shareOpen && dashboard && (
        <ShareDialog
          dashboardId={dashboard.id}
          initialVisibility={dashboard.visibility ?? "PRIVATE"}
          initialShareEnabled={dashboard.shareEnabled ?? false}
          onSave={saveShare}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

/** CSV export using dashboard name if present */
function exportCsv(dashboardName: string, all: Record<string, any>) {
  const rows = Object.entries(all).flatMap(([wid, payload]) => {
    if (!payload?.rows) return [];
    return payload.rows.map((r: any) => ({ widgetId: wid, ...r }));
  });

  // trivial CSV
  const header = rows.length ? Object.keys(rows[0]) : ["widgetId"];
  const csv =
    header.join(",") +
    "\n" +
    rows.map(r => header.map(h => JSON.stringify(r[h] ?? "")).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${dashboardName || "dashboard"}.csv`; // ✅ filename uses dashboard name
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

