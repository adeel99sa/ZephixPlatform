// Phase 4.3: Widget Renderer with Analytics Widgets
import { fmtPercent, trendArrow } from "./format";
import { ProjectHealthWidget } from "./project-health";
import { ResourceUtilizationWidget } from "./resource-utilization";
import { ConflictTrendsWidget } from "./conflict-trends";
import { SprintProgressWidget } from "./sprint-progress";
import type { DashboardWidget } from "../types";
import type { WidgetFilters } from "./types";

type LegacyWidget =
  | { id: string; type: 'kpi'; label: string; value: string; trend?: string; config?: any }
  | { id: string; type: 'note'; text: string }
  | { id: string; type: 'table'; columns: string[]; rows: string[][] }
  | { id: string; type: 'chart'; chartType: 'line' | 'bar'; series: number[] };

type Props = {
  widget: LegacyWidget | DashboardWidget;
  data?: any;
  filters?: WidgetFilters;
  isShareMode?: boolean; // If true, show "Sign in to load live data" for analytics widgets
};

export function WidgetRenderer({ widget, data, filters, isShareMode = false }: Props) {
  // Handle new analytics widget types (DashboardWidget)
  if ('type' in widget && typeof widget.type === 'string' && 'layout' in widget) {
    const dashboardWidget = widget as DashboardWidget;
    const widgetFilters: WidgetFilters = filters || {
      startDate: undefined,
      endDate: undefined,
    };

    // In share mode, show sign-in prompt for analytics widgets
    if (isShareMode) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <p className="text-sm font-medium mb-2">Sign in required</p>
          <p className="text-xs">Please sign in to load live data for this widget.</p>
        </div>
      );
    }

    switch (dashboardWidget.type) {
      case 'project_health':
        return <ProjectHealthWidget widget={dashboardWidget} filters={widgetFilters} workspaceId={null} />;

      case 'resource_utilization':
        return <ResourceUtilizationWidget widget={dashboardWidget} filters={widgetFilters} workspaceId={null} />;

      case 'conflict_trends':
        return <ConflictTrendsWidget widget={dashboardWidget} filters={widgetFilters} workspaceId={null} />;

      case 'sprint_progress':
        return <SprintProgressWidget widget={dashboardWidget} />;

      default:
        return (
          <div className="rounded-lg border p-3 shadow-sm text-sm text-gray-500" data-testid={`widget-${widget.id}`}>
            Widget type not supported: {dashboardWidget.type}
          </div>
        );
    }
  }

  // Legacy widget types (for backward compatibility)
  const legacyWidget = widget as LegacyWidget;

  if (legacyWidget.type === 'kpi') {
    const label = legacyWidget.config?.label ?? legacyWidget.label ?? 'KPI';
    const val = typeof data?.value === 'number' ? data.value : 0;
    const trend = data?.trend;
    const error = data?.error;
    const formatted = Number.isFinite(val) ? val.toLocaleString() : '0';

    if (error) {
      return (
        <div data-testid={`widget-${widget.id}`} className="p-4 border rounded">
          <div className="text-sm text-neutral-400">Projects — unavailable</div>
        </div>
      );
    }

    return (
      <div data-testid={`widget-${widget.id}`} className="p-4 border rounded flex flex-col gap-1">
        <div className="text-sm text-neutral-600">{label}</div>
        <div className="text-3xl font-semibold">{formatted}</div>
        {trend && <div className="text-xs text-neutral-500">{trendArrow(trend)}</div>}
      </div>
    );
  }

  if (legacyWidget.type === 'note') {
    const d = data ?? { text: legacyWidget.text ?? 'Note' };
    return (
      <div className="rounded-lg border p-3 shadow-sm" data-testid={`widget-${widget.id}`}>
        <div className="whitespace-pre-wrap text-sm">{d.text}</div>
      </div>
    );
  }

  if (legacyWidget.type === 'table') {
    const d = data ?? { columns: legacyWidget.columns ?? [], rows: legacyWidget.rows ?? [] };
    return (
      <div className="rounded-lg border p-3 shadow-sm" data-testid={`widget-${widget.id}`}>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr>{d.columns.map((c: string) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}</tr>
            </thead>
            <tbody>
              {d.rows.map((r: any, i: number) => (
                <tr key={i} className="even:bg-neutral-50 hover:bg-neutral-100">
                  {d.columns.map((c: string, j: number) => <td key={`${i}-${j}`} className="px-2 py-1 truncate">{r[c]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (legacyWidget.type === 'chart') {
    const d = data ?? { chartType: legacyWidget.chartType ?? 'line', series: legacyWidget.series ?? [] };
    return (
      <div className="rounded-lg border p-3 shadow-sm" data-testid={`widget-${widget.id}`}>
        <div className="text-xs text-neutral-500 mb-1">Chart ({d.chartType})</div>
        <div className="text-sm">{JSON.stringify(d.series)}</div>
      </div>
    );
  }

  // Unknown widget type
  return (
    <div className="rounded-lg border p-3 shadow-sm text-sm text-gray-500" data-testid={`widget-${widget.id}`}>
      Widget type not supported: {('type' in widget ? widget.type : 'unknown')}
    </div>
  );
}
