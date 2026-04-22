/**
 * Pass 3 — Per-card Settings and Data tab content.
 * Each card type provides its own settings fields and data table rows.
 */
import { DataTable, SettingsField, SettingsInput, ReadOnlySource } from "./FullScreenCardModal";
import type {
  DashboardSummary,
  DashboardMilestone,
  DashboardRisksResponse,
  WorkspaceSummary,
  WorkspaceHealthData,
} from "../api";

/* ── Shared data context type passed to all card details ── */

export type CardDataContext = {
  dashSummary: DashboardSummary | null;
  summary: WorkspaceSummary | null;
  health: WorkspaceHealthData | null;
  risks: DashboardRisksResponse | null;
  milestones: DashboardMilestone[] | null;
};

/* ── Settings content per card type ── */

export function cardSettingsContent(
  cardId: string,
  _titleOverride: string,
  _onTitleChange: (v: string) => void,
): React.ReactNode {
  // All cards get a title override + read-only source
  // Specific cards get additional options
  return (
    <div>
      <ReadOnlySource />
      <div className="mt-4 text-xs text-slate-400">
        Card settings will expand in future updates.
      </div>
    </div>
  );
}

/* ── Data tab content per card type ── */

export function cardDataContent(cardId: string, ctx: CardDataContext): React.ReactNode {
  switch (cardId) {
    case "project-health":
    case "project-status-distribution":
    case "projects-off-track":
      return <ProjectHealthData ctx={ctx} />;

    case "tasks-in-progress":
    case "completed-work":
    case "tasks-due-this-week":
      return <TasksData ctx={ctx} cardId={cardId} />;

    case "overdue-work":
      return <OverdueData ctx={ctx} />;

    case "upcoming-milestones":
      return <MilestonesData milestones={ctx.milestones} />;

    case "open-risks":
    case "high-risks":
      return <RisksData risks={ctx.risks} highOnly={cardId === "high-risks"} />;

    case "budget-status":
      return (
        <div className="py-8 text-center text-sm text-slate-400">
          No budget data available yet. Budget records will appear when project budgets are added.
        </div>
      );

    case "recent-activity":
      return <ActivityData ctx={ctx} />;

    default:
      return (
        <div className="py-8 text-center text-sm text-slate-400">
          No data available for this card type.
        </div>
      );
  }
}

/* ── Which cards support filters ── */

export function cardHasFilters(cardId: string): boolean {
  return [
    "tasks-in-progress",
    "overdue-work",
    "upcoming-milestones",
    "open-risks",
    "high-risks",
    "completed-work",
    "tasks-due-this-week",
  ].includes(cardId);
}

/* ── Data components ── */

function ProjectHealthData({ ctx }: { ctx: CardDataContext }) {
  const entries = ctx.dashSummary
    ? Object.entries(ctx.dashSummary.projectStatusSummary)
    : [];

  return (
    <DataTable
      columns={["Status", "Count"]}
      rows={entries.map(([status, count]) => ({
        Status: <span className="capitalize">{status.toLowerCase().replace(/_/g, " ")}</span>,
        Count: count,
      }))}
      emptyMessage="No project data available."
    />
  );
}

function TasksData({ ctx, cardId }: { ctx: CardDataContext; cardId: string }) {
  const counts = ctx.health?.executionSummary?.counts;
  if (!counts) {
    return <div className="py-8 text-center text-sm text-slate-400">No task data available.</div>;
  }

  const rows = [
    { Metric: "Total tasks", Value: counts.totalWorkItems },
    { Metric: "In progress", Value: counts.inProgress },
    { Metric: "Completed", Value: ctx.summary?.tasksCompleted ?? counts.doneLast7Days },
    { Metric: "Overdue", Value: counts.overdueWorkItems },
    { Metric: "Due soon (7 days)", Value: counts.dueSoon7Days },
  ];

  return <DataTable columns={["Metric", "Value"]} rows={rows} />;
}

function OverdueData({ ctx }: { ctx: CardDataContext }) {
  const items = ctx.health?.executionSummary?.topOverdue ?? [];

  return (
    <DataTable
      columns={["Item", "Project", "Due Date"]}
      rows={items.map((item) => ({
        Item: item.title,
        Project: item.projectName,
        "Due Date": item.dueDate
          ? new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
          : "—",
      }))}
      emptyMessage="No overdue items."
    />
  );
}

function MilestonesData({ milestones }: { milestones: DashboardMilestone[] | null }) {
  return (
    <DataTable
      columns={["Milestone", "Due Date"]}
      rows={(milestones ?? []).map((ms) => ({
        Milestone: ms.name,
        "Due Date": new Date(ms.dueDate).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }))}
      emptyMessage="No upcoming milestones."
    />
  );
}

function RisksData({
  risks,
  highOnly,
}: {
  risks: DashboardRisksResponse | null;
  highOnly: boolean;
}) {
  const items = highOnly
    ? (risks?.items ?? []).filter(
        (r) => r.severity === "HIGH" || r.severity === "CRITICAL",
      )
    : risks?.items ?? [];

  return (
    <DataTable
      columns={["Risk", "Severity", "Status"]}
      rows={items.map((r) => ({
        Risk: r.title,
        Severity: (
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
              r.severity === "HIGH" || r.severity === "CRITICAL"
                ? "bg-red-100 text-red-700"
                : r.severity === "MEDIUM"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {r.severity?.toLowerCase()}
          </span>
        ),
        Status: r.status?.toLowerCase(),
      }))}
      emptyMessage={highOnly ? "No high or critical risks." : "No open risks."}
    />
  );
}

function ActivityData({ ctx }: { ctx: CardDataContext }) {
  const activities: Array<{
    actorName: string;
    action: string;
    itemTitle: string;
    createdAt: string;
  }> = (ctx.health?.executionSummary as any)?.recentActivity ?? [];

  return (
    <DataTable
      columns={["Actor", "Action", "Item", "Time"]}
      rows={activities.map((a) => ({
        Actor: a.actorName || "Unknown",
        Action: a.action,
        Item: a.itemTitle,
        Time: new Date(a.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      }))}
      emptyMessage="No recent activity."
    />
  );
}
