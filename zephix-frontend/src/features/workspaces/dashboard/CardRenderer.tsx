/**
 * Pass 4 — Unified card renderer.
 * Renders any card by its registry ID, passing the right data and action props.
 */
import type { DashboardCardProps } from "./DashboardCard";
import type {
  DashboardSummary,
  DashboardMilestone,
  DashboardRisksResponse,
  WorkspaceSummary,
  WorkspaceHealthData,
} from "../api";

import {
  ProjectHealthCard,
  TasksInProgressCard,
  OverdueWorkCard,
  UpcomingMilestonesCard,
  OpenRisksCard,
  BudgetStatusCard,
} from "./cards";
import {
  ProjectStatusDistributionCard,
  CompletedWorkCard,
  TasksDueThisWeekCard,
  HighRisksCard,
  ProjectsOffTrackCard,
  RecentActivityCard,
} from "./addable-cards";

type Actions = DashboardCardProps["actions"];

export interface CardRendererProps {
  cardId: string;
  dashSummary: DashboardSummary | null;
  summary: WorkspaceSummary | null;
  health: WorkspaceHealthData | null;
  risks: DashboardRisksResponse | null;
  milestones: DashboardMilestone[] | null;
  loading: boolean;
  actions?: Actions;
}

export function CardRenderer({
  cardId,
  dashSummary,
  summary,
  health,
  risks,
  milestones,
  loading,
  actions,
}: CardRendererProps) {
  switch (cardId) {
    // Default 6
    case "project-health":
      return <ProjectHealthCard data={dashSummary} loading={loading} actions={actions} />;
    case "tasks-in-progress":
      return <TasksInProgressCard summary={summary} health={health} loading={loading} actions={actions} />;
    case "overdue-work":
      return <OverdueWorkCard health={health} loading={loading} actions={actions} />;
    case "upcoming-milestones":
      return <UpcomingMilestonesCard milestones={milestones} loading={loading} actions={actions} />;
    case "open-risks":
      return <OpenRisksCard risks={risks} loading={loading} actions={actions} />;
    case "budget-status":
      return <BudgetStatusCard actions={actions} />;

    // Addable cards
    case "project-status-distribution":
      return <ProjectStatusDistributionCard data={dashSummary} loading={loading} actions={actions} />;
    case "completed-work":
      return <CompletedWorkCard summary={summary} health={health} loading={loading} actions={actions} />;
    case "tasks-due-this-week":
      return <TasksDueThisWeekCard health={health} loading={loading} actions={actions} />;
    case "high-risks":
      return <HighRisksCard risks={risks} loading={loading} actions={actions} />;
    case "projects-off-track":
      return <ProjectsOffTrackCard health={health} loading={loading} actions={actions} />;
    case "recent-activity":
      return <RecentActivityCard health={health} loading={loading} actions={actions} />;

    default:
      return null;
  }
}
