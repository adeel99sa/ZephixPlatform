/**
 * Pass 1 — Six default workspace dashboard cards.
 * Each card receives pre-fetched data from the parent and renders content or empty state.
 * No settings, no filters, no full-screen — those are Pass 3.
 */
import { Activity, AlertTriangle, CalendarClock, DollarSign, Layers, TrendingUp } from "lucide-react";
import { DashboardCard, CardEmpty, CardLoading, type DashboardCardProps } from "./DashboardCard";
import type {
  DashboardSummary,
  DashboardMilestone,
  DashboardRisksResponse,
  WorkspaceSummary,
  WorkspaceHealthData,
} from "../api";

type CardActions = DashboardCardProps["actions"];

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === "ACTIVE" || s === "IN_PROGRESS") return "bg-blue-500";
  if (s === "COMPLETED" || s === "DONE") return "bg-emerald-500";
  if (s === "AT_RISK" || s === "BLOCKED") return "bg-red-500";
  if (s === "ON_HOLD" || s === "PAUSED") return "bg-amber-500";
  if (s === "DRAFT" || s === "PLANNING") return "bg-slate-400";
  return "bg-slate-300";
}

/* ── 1. Project Health ── */

export function ProjectHealthCard({
  data,
  loading,
  actions,
}: {
  data: DashboardSummary | null;
  loading: boolean;
  actions?: CardActions;
}) {
  return (
    <DashboardCard title="Project Health" icon={<TrendingUp className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : !data || data.projectCount === 0 ? (
        <CardEmpty message="No project health data yet. Health indicators will appear when projects in this workspace begin tracking status." />
      ) : (
        <div className="space-y-3">
          <div className="text-3xl font-bold text-slate-900">{data.projectCount}</div>
          <p className="text-xs text-slate-500">projects in workspace</p>
          <div className="space-y-1.5 pt-1">
            {Object.entries(data.projectStatusSummary).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${statusColor(status)}`} />
                  <span className="text-slate-600 capitalize">{status.toLowerCase().replace(/_/g, " ")}</span>
                </div>
                <span className="font-medium text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

/* ── 2. Tasks In Progress ── */

export function TasksInProgressCard({
  summary,
  health,
  loading,
  actions,
}: {
  summary: WorkspaceSummary | null;
  health: WorkspaceHealthData | null;
  loading: boolean;
  actions?: CardActions;
}) {
  const inProgress = health?.executionSummary?.counts?.inProgress ?? 0;
  const total = summary?.tasksTotal ?? health?.executionSummary?.counts?.totalWorkItems ?? 0;
  const completed = summary?.tasksCompleted ?? health?.executionSummary?.counts?.doneLast7Days ?? 0;
  const hasData = total > 0;

  return (
    <DashboardCard title="Tasks In Progress" icon={<Activity className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : !hasData ? (
        <CardEmpty message="No active task flow yet. In-progress work will appear here when tasks start moving." />
      ) : (
        <div className="space-y-3">
          <div className="text-3xl font-bold text-slate-900">{inProgress}</div>
          <p className="text-xs text-slate-500">tasks in progress</p>
          <div className="mt-2 space-y-1.5 pt-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total tasks</span>
              <span className="font-medium text-slate-900">{total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Completed</span>
              <span className="font-medium text-emerald-600">{completed}</span>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

/* ── 3. Overdue Work ── */

export function OverdueWorkCard({
  health,
  loading,
  actions,
}: {
  health: WorkspaceHealthData | null;
  loading: boolean;
  actions?: CardActions;
}) {
  const count = health?.executionSummary?.counts?.overdueWorkItems ?? 0;
  const items = health?.executionSummary?.topOverdue ?? [];

  return (
    <DashboardCard title="Overdue Work" icon={<AlertTriangle className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : count === 0 ? (
        <CardEmpty message="No overdue work. Items with missed dates will appear here if schedules slip." />
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-600">{count}</span>
            <span className="text-xs text-slate-500">overdue items</span>
          </div>
          <div className="space-y-2 pt-1">
            {items.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-800">{item.title}</div>
                  <div className="truncate text-xs text-slate-400">{item.projectName}</div>
                </div>
                {item.dueDate && (
                  <span className="shrink-0 text-xs text-red-500">
                    {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))}
            {count > 5 && (
              <p className="text-xs text-slate-400">+{count - 5} more</p>
            )}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

/* ── 4. Upcoming Milestones ── */

export function UpcomingMilestonesCard({
  milestones,
  loading,
  actions,
}: {
  milestones: DashboardMilestone[] | null;
  loading: boolean;
  actions?: CardActions;
}) {
  return (
    <DashboardCard title="Upcoming Milestones" icon={<CalendarClock className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : !milestones || milestones.length === 0 ? (
        <CardEmpty message="No upcoming milestones yet. Milestones will appear here when project schedules are created." />
      ) : (
        <div className="space-y-2">
          {milestones.slice(0, 6).map((ms) => (
            <div key={ms.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-800">{ms.name}</div>
              </div>
              <span className="shrink-0 text-xs text-slate-500">
                {new Date(ms.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

/* ── 5. Open Risks ── */

export function OpenRisksCard({
  risks,
  loading,
  actions,
}: {
  risks: DashboardRisksResponse | null;
  loading: boolean;
  actions?: CardActions;
}) {
  const highSeverity = risks?.items?.filter((r) => r.severity === "HIGH" || r.severity === "CRITICAL") ?? [];

  return (
    <DashboardCard title="Open Risks" icon={<AlertTriangle className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : !risks || risks.count === 0 ? (
        <CardEmpty message="No risks logged yet. Risks will appear here when projects begin tracking threats and issues." />
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{risks.count}</span>
            <span className="text-xs text-slate-500">open risks</span>
          </div>
          {highSeverity.length > 0 && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {highSeverity.length} high severity
            </div>
          )}
          <div className="space-y-2 pt-1">
            {risks.items.slice(0, 5).map((risk) => (
              <div key={risk.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-800">{risk.title}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    risk.severity === "HIGH" || risk.severity === "CRITICAL"
                      ? "bg-red-100 text-red-700"
                      : risk.severity === "MEDIUM"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {risk.severity?.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

/* ── 6. Budget Status ──
 * Stabilization Pass 1 — this card has NO data source. There is no
 * budget aggregation endpoint and no budget table the workspace
 * dashboard can query. Until a real source ships, the card must not
 * present as a live "no data yet" empty state — that wording implies
 * "you just don't have data" and erodes trust when the user actually
 * has projects with budgets configured. The Coming soon badge is the
 * truthful presentation: the feature is not wired, the card is a
 * placeholder, no user action will populate it. */
export function BudgetStatusCard({ actions }: { actions?: CardActions }) {
  return (
    <DashboardCard title="Budget Status" icon={<DollarSign className="h-4 w-4" />} actions={actions}>
      <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
        <span
          className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700"
          data-testid="budget-status-coming-soon"
        >
          Coming soon
        </span>
        <p className="max-w-[220px] text-xs text-slate-500">
          Workspace budget tracking is on the platform roadmap. No budget data is collected yet.
        </p>
      </div>
    </DashboardCard>
  );
}
