export type DashboardScopeType = 'home' | 'workspace' | 'portfolio';

export type DashboardCardCategory =
  | 'featured'
  | 'tasks'
  | 'project-health'
  | 'resources'
  | 'governance'
  | 'ai-insights';

export type DashboardCardDisplayType = 'metric' | 'chart' | 'table';

export type DashboardCardSize = 'small' | 'medium' | 'large';

export type DashboardCardKey =
  | 'my_tasks_today'
  | 'overdue_tasks'
  | 'blocked_tasks'
  | 'tasks_by_status'
  | 'projects_at_risk'
  | 'upcoming_deadlines'
  | 'milestone_progress'
  | 'workload_distribution'
  | 'resource_capacity'
  | 'active_risks';

export interface DashboardCardDefinition {
  cardKey: DashboardCardKey;
  title: string;
  description: string;
  category: DashboardCardCategory;
  supportedScopes: DashboardScopeType[];
  defaultDisplayType: DashboardCardDisplayType;
  defaultSize: DashboardCardSize;
  drilldownRouteTemplate: string;
  resolverKey: DashboardCardKey;
}

export interface DashboardCardData {
  cardKey: DashboardCardKey;
  scopeType: DashboardScopeType;
  scopeId: string;
  summary: {
    primaryValue: number;
    secondaryLabel?: string;
    secondaryValue?: number;
  };
  displayData: Record<string, unknown>;
  drilldown: {
    route: string;
  };
  generatedFromTimestamp: string;
}

export interface DashboardCardInstance {
  id: string;
  cardKey: DashboardCardKey;
  title: string;
  displayType: DashboardCardDisplayType;
  size: DashboardCardSize;
  data: DashboardCardData;
}

