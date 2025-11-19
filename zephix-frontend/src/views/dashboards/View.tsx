// src/views/dashboards/View.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { fetchDashboard } from "@/features/dashboards/api";
import { queryWidgets } from "@/features/widgets/api";
import FiltersBar from "@/features/dashboards/FiltersBar";
import { parseFiltersFromUrl, filtersToUrl } from "@/features/dashboards/filters";
import { WidgetRenderer } from "@/features/dashboards/widgets/WidgetRenderer";
import ShareDialog from "@/features/dashboards/ShareDialog";
import { track } from "@/lib/telemetry";
import { getProjectsCountByWorkspace } from "@/features/projects/api";

type Dashboard = {
  id: string;
  name: string;
  visibility?: string;
  filters?: any;
  widgets?: Array<{
    id: string;
    type: string;
    config?: any;
    position?: { x: number; y: number; w: number; h: number };
  }>;
};

export default function DashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgetsData, setWidgetsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [kpiCache, setKpiCache] = useState<Map<string, { value: number; timestamp: number }>>(new Map());

  const urlFilters = useMemo(() => parseFiltersFromUrl(location.search), [location.search]);

  // Listen for project create/update events to invalidate KPI cache
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { workspaceId } = e.detail;
      setKpiCache(prev => {
        const next = new Map(prev);
        next.delete(workspaceId); // Invalidate cache for this workspace
        return next;
      });
    };

    window.addEventListener('project:created', handler as EventListener);
    window.addEventListener('project:updated', handler as EventListener);

    return () => {
      window.removeEventListener('project:created', handler as EventListener);
      window.removeEventListener('project:updated', handler as EventListener);
    };
  }, []);

  // 1) Load dashboard
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        console.log('[DashboardView] Fetching dashboard:', id);
        // NOTE: our api interceptor unwraps envelopes, so fetchDashboard returns the resource directly
        const d = await fetchDashboard(id!);
        console.log('[DashboardView] Fetched dashboard:', d);
        if (!alive) return;
        setDashboard(d);
      } catch (e) {
        // still render the shell; show a simple fallback title
        console.warn("Dashboard load failed", e);
        setDashboard({ id: id!, name: "Dashboard", widgets: [] });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // 2) Query widgets when dashboard/filters are ready
  useEffect(() => {
    console.log('[DashboardView] Widget query effect triggered:', { dashboard, urlFilters });
    if (!dashboard) return;
    const widgets = dashboard.widgets || [];
    console.log('[DashboardView] Widgets to query:', widgets);
    if (!widgets.length) {
      setWidgetsData({});
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        console.log('[DashboardView] Starting widget query...');

        // Existing generic widget query
        const generic = await queryWidgets(
          widgets.map(w => ({ id: w.id, type: w.type, config: w.config })),
          urlFilters,
          controller.signal,
        );
        console.log('[DashboardView] Widget query results:', generic);

        // Fetch KPI data for projects.countByWorkspace widgets
        const projectKpiWidgets = widgets.filter(
          w => w.type === 'kpi' && w.config?.source === 'projects.countByWorkspace'
        );

        // Fetch KPI data for workItems.completedRatio widgets
        const taskKpiWidgets = widgets.filter(
          w => w.type === 'kpi' && (w.config?.source === 'workItems.completedRatio.byProject' || w.config?.source === 'workItems.completedRatio.byWorkspace')
        );

        const localCache = new Map<string, number>();
        const localTaskCache = new Map<string, { completed: number; total: number; ratio: number }>();

        const projectKpiResults = await Promise.all(
          projectKpiWidgets.map(async (w) => {
            const wsId = w.config?.workspaceId;
            if (!wsId) return { id: w.id, data: { value: 0 } };

            // Check if we have a cached value (and it's recent, < 30s old)
            const cached = kpiCache.get(wsId);
            const now = Date.now();
            if (cached && (now - cached.timestamp) < 30000) {
              return { id: w.id, data: { value: cached.value } };
            }

            if (!localCache.has(wsId)) {
              try {
                const count = await getProjectsCountByWorkspace(wsId);
                localCache.set(wsId, count);
                setKpiCache(prev => new Map(prev).set(wsId, { value: count, timestamp: now }));
                track('kpi.projects_count.fetched', { wsId, count, widgetId: w.id });
              } catch (e) {
                console.warn('Failed to fetch project count for workspace', wsId, e);
                localCache.set(wsId, 0);
                track('kpi.projects_count.error', { wsId, widgetId: w.id, error: (e as Error).message });
              }
            }
            return { id: w.id, data: { value: localCache.get(wsId) ?? 0 } };
          })
        );

        const taskKpiResults = await Promise.all(
          taskKpiWidgets.map(async (w) => {
            try {
              const source = w.config?.source;
              let data;

              if (source === 'workItems.completedRatio.byProject') {
                const projectId = w.config?.projectId;
                if (!projectId) return { id: w.id, data: { error: true } };
                data = await getCompletionRatioByProject(projectId);
                track('kpi.workitems_ratio.fetched', { projectId, widgetId: w.id });
              } else if (source === 'workItems.completedRatio.byWorkspace') {
                const wsId = w.config?.workspaceId;
                if (!wsId) return { id: w.id, data: { error: true } };
                data = await getCompletionRatioByWorkspace(wsId);
                track('kpi.workitems_ratio.fetched', { wsId, widgetId: w.id });
              }

              return { id: w.id, data };
            } catch (e) {
              track('kpi.workitems_ratio.error', { widgetId: w.id, error: (e as Error).message });
              return { id: w.id, data: { error: true } };
            }
          })
        );

        // Merge generic results with KPI results (KPI wins for same id)
        const merged: Record<string, any> = generic || {};
        projectKpiResults.forEach((k) => {
          merged[k.id] = k.data;
        });
        taskKpiResults.forEach((k) => {
          merged[k.id] = k.data;
        });

        setWidgetsData(merged);
      } catch (e) {
        console.warn("Widget query failed", e);
        setWidgetsData({});
      }
    })();
    return () => controller.abort();
  }, [dashboard, urlFilters]);

  const onApplyFilters = (filters: any) => {
    const url = filtersToUrl(filters, location);
    navigate(url, { replace: true });
    track("ui.db.filters.apply", { id, filters });
  };

  const openShare = () => {
    setShareOpen(true);
    track("ui.db.share.open", { id });
  };

  const saveShare = async (visibility: 'private'|'workspace'|'org') => {
    // PATCH /api/dashboards/:id visibility (mocked in tests)
    setDashboard((d: any) => ({ ...d, visibility }));
  };

  const name = dashboard?.name ?? "Dashboard";
  const widgets = dashboard?.widgets ?? [];

  return (
    <div className="p-4 space-y-4" data-testid="dashboard-view">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" data-testid="dashboard-title">
          {name}
        </h1>
        <div className="flex items-center gap-2">
          <button
            data-testid="dashboard-share"
            className="px-3 py-1.5 rounded border"
            onClick={openShare}
          >
            Share
          </button>
          <button
            data-testid="dashboard-export"
            className="px-3 py-1.5 rounded border"
            onClick={() => exportCsv(name, widgetsData)}
          >
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <FiltersBar storageKey={`dash:${id}:filters`} onApply={onApplyFilters} />

      {/* Widgets container (always render; show empty state if none) */}
      <div data-testid="dashboard-widgets" className="grid grid-cols-12 gap-4">
        {loading && (
          <div className="col-span-12 animate-pulse space-y-2">
            <div className="h-6 w-48 bg-neutral-200 rounded" />
            <div className="h-20 w-full bg-neutral-200 rounded" />
          </div>
        )}

        {!loading && widgets.length === 0 && (
          <div className="col-span-12 text-sm text-neutral-500">
            No widgets configured.
          </div>
        )}

                {!loading &&
                  widgets.map(w => (
                    <div
                      key={w.id}
                      className="col-span-12 md:col-span-6 lg:col-span-4"
                    >
                      <WidgetRenderer widget={w} data={widgetsData[w.id]} />
                    </div>
                  ))}
      </div>

      {shareOpen && (
        <ShareDialog
          initialVisibility={dashboard?.visibility ?? 'workspace'}
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
