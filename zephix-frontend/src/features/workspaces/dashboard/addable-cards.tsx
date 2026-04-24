/**
 * Pass 2 — Addable insight cards beyond the default 6.
 * Each receives the same pre-fetched data from the parent dashboard.
 */
import { BarChart3, CheckCircle2, Clock, AlertOctagon, TrendingDown, Activity } from "lucide-react";
import { DashboardCard, CardEmpty, CardLoading, type DashboardCardProps } from "./DashboardCard";
import type {
  DashboardSummary,
  DashboardRisksResponse,
  WorkspaceSummary,
  WorkspaceHealthData,
} from "../api";

type CardActions = DashboardCardProps["actions"];

/* ── Project Status Distribution ── */

export function ProjectStatusDistributionCard({
  data,
  loading,
  actions,
}: {
  data: DashboardSummary | null;
  loading: boolean;
  actions?: CardActions;
}) {
  const entries = data ? Object.entries(data.projectStatusSummary || {}) : [];
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <DashboardCard title="Project Status Distribution" icon={<BarChart3 className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : total === 0 ? (
        <CardEmpty message="No projects yet. Status distribution will appear when projects are created." />
      ) : (
        <div className="space-y-3">
          {entries.map(([status, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600 capitalize">{status.toLowerCase().replace(/_/g, " ")}</span>
                  <span className="text-xs text-slate-500">{count} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}

/* ── Completed Work ── */

export function CompletedWorkCard({
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
  const completed = summary?.tasksCompleted ?? 0;
  const total = summary?.tasksTotal ?? 0;
  const doneLast7 = health?.executionSummary?.counts?.doneLast7Days ?? 0;
  const hasData = total > 0;

  return (
    <DashboardCard title="Completed Work" icon={<CheckCircle2 className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : !hasData ? (
        <CardEmpty message="No completed work yet. Completed tasks will appear here as work progresses." />
      ) : (
        <div className="space-y-3">
          <div className="text-3xl font-bold text-emerald-600">{completed}</div>
          <p className="text-xs text-slate-500">tasks completed</p>
          <div className="space-y-1.5 pt-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total tasks</span>
              <span className="font-medium text-slate-900">{total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Done last 7 days</span>
              <span className="font-medium text-emerald-600">{doneLast7}</span>
            </div>
            {total > 0 && (
              <div className="pt-2">
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.round((completed / total) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">{Math.round((completed / total) * 100)}% complete</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

/* ── Tasks Due This Week ── */

export function TasksDueThisWeekCard({
  health,
  loading,
  actions,
}: {
  health: WorkspaceHealthData | null;
  loading: boolean;
  actions?: CardActions;
}) {
  const dueSoon = health?.executionSummary?.counts?.dueSoon7Days ?? 0;

  return (
    <DashboardCard title="Tasks Due This Week" icon={<Clock className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : dueSoon === 0 ? (
        <CardEmpty message="No tasks due this week. Upcoming deadlines will appear here." />
      ) : (
        <div className="space-y-3">
          <div className="text-3xl font-bold text-amber-600">{dueSoon}</div>
          <p className="text-xs text-slate-500">tasks due in the next 7 days</p>
        </div>
      )}
    </DashboardCard>
  );
}

/* ── High Risks ── */

export function HighRisksCard({
  risks,
  loading,
  actions,
}: {
  risks: DashboardRisksResponse | null;
  loading: boolean;
  actions?: CardActions;
}) {
  const highItems = risks?.items?.filter(
    (r) => r.severity === "HIGH" || r.severity === "CRITICAL",
  ) ?? [];

  return (
    <DashboardCard title="High Risks" icon={<AlertOctagon className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : highItems.length === 0 ? (
        <CardEmpty message="No high or critical risks. High-severity risks will appear here when identified." />
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-600">{highItems.length}</span>
            <span className="text-xs text-slate-500">high / critical risks</span>
          </div>
          <div className="space-y-2 pt-1">
            {highItems.slice(0, 5).map((risk) => (
              <div key={risk.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-800">{risk.title}</span>
                <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
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

/* ── Projects Off Track ── */

export function ProjectsOffTrackCard({
  health,
  loading,
  actions,
}: {
  health: WorkspaceHealthData | null;
  loading: boolean;
  actions?: CardActions;
}) {
  const overdue = health?.executionSummary?.counts?.overdueWorkItems ?? 0;
  const activeProjects = health?.executionSummary?.counts?.activeProjects ?? 0;

  return (
    <DashboardCard title="Projects Off Track" icon={<TrendingDown className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : activeProjects === 0 ? (
        <CardEmpty message="No active projects yet. Off-track indicators will appear when projects have overdue work." />
      ) : overdue === 0 ? (
        <div className="flex min-h-[100px] flex-col items-center justify-center">
          <div className="text-3xl font-bold text-emerald-600">0</div>
          <p className="mt-1 text-sm text-slate-500">All projects on track</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 px-4 py-3">
            <div className="text-2xl font-bold text-amber-700">{overdue}</div>
            <p className="text-xs text-amber-600">overdue items across {activeProjects} project{activeProjects !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

/* ── Recent Activity ── */

export function RecentActivityCard({
  health,
  loading,
  actions,
}: {
  health: WorkspaceHealthData | null;
  loading: boolean;
  actions?: CardActions;
}) {
  // The health endpoint returns recentActivity but we haven't typed it in Pass 1.
  // Access it safely via any cast — the backend returns it in executionSummary.
  const activities: Array<{
    id: string;
    action: string;
    actorName: string;
    itemTitle: string;
    createdAt: string;
  }> = (health?.executionSummary as any)?.recentActivity ?? [];

  return (
    <DashboardCard title="Recent Activity" icon={<Activity className="h-4 w-4" />} actions={actions}>
      {loading ? (
        <CardLoading />
      ) : activities.length === 0 ? (
        <CardEmpty message="No recent activity. Updates will appear here as work progresses." />
      ) : (
        <div className="space-y-2.5">
          {activities.slice(0, 6).map((a, i) => (
            <div key={a.id || i} className="flex items-start gap-2 text-sm">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-slate-700">{a.actorName || "Someone"}</span>{" "}
                <span className="text-slate-500">{a.action}</span>{" "}
                <span className="font-medium text-slate-700">{a.itemTitle}</span>
                <div className="text-xs text-slate-400">
                  {new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
