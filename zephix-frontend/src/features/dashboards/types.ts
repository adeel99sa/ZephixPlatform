// Phase 4.3 Dashboard Types
// Strict types matching backend DTOs

export type DashboardVisibility = "WORKSPACE" | "ORG" | "PRIVATE";

// Widget allowlist matching backend
export type WidgetType =
  | "project_health"
  | "sprint_metrics"
  | "resource_utilization"
  | "conflict_trends"
  | "portfolio_summary"
  | "program_summary"
  | "budget_variance"
  | "risk_summary"
  | "recent_projects"
  | "project_status_summary"
  | "upcoming_milestones"
  | "open_risks"
  | "documents_summary"
  | "kpi"
  // Phase 2B: Waterfall core
  | "critical_path_risk"
  | "earned_value_summary"
  // KPI cards: Projects at risk (EVM), Overdue tasks
  | "projects_at_risk"
  | "overdue_tasks";

export interface DashboardLayoutItem {
  i?: string; // widget id (optional in persisted layout)
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: Record<string, any>;
  dataSource?: string;
}

export interface WidgetConfig {
  [key: string]: string | number | boolean | null;
}

export interface WidgetDataSource {
  kind:
    | "kpi_cards"
    | "project_health_list"
    | "risk_summary"
    | "budget_summary"
    | "resource_utilization"
    | "recent_projects"
    | "project_status_summary"
    | "upcoming_milestones"
    | "open_risks"
    | "documents_summary";
  metricKey?: string;
  projectId?: string;
}

export interface DashboardLayout {
  version: 1;
  grid: {
    columns: 12;
    rowHeight: number;
  };
  widgets: Array<{
    id: string;
    type: WidgetDataSource["kind"];
    title: string;
    layout: DashboardLayoutItem;
    config: WidgetConfig;
    dataSource?: WidgetDataSource;
  }>;
}

export interface DashboardEntity {
  id: string;
  name: string;
  description?: string;
  visibility: DashboardVisibility;
  workspaceId: string;
  createdBy?: string;
  layoutConfig?: DashboardLayout;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
  shareToken?: string | null;
  shareEnabled?: boolean;
  shareExpiresAt?: string | null;
}

export interface SharedDashboardEntity {
  id: string;
  name: string;
  description?: string | null;
  visibility?: DashboardVisibility;
  widgets: DashboardWidget[];
  shareEnabled?: boolean;
  shareToken?: string | null;
}

export interface DashboardTemplate {
  id: string;
  key: string;
  name: string;
  description?: string;
  persona: string;
  methodology?: string;
  definition: {
    widgets: Array<{
      widgetKey: WidgetType;
      title: string;
      config: Record<string, any>;
      layout: { x: number; y: number; w: number; h: number };
    }>;
  };
}

export interface AISuggestResponse {
  templateKey: string;
  widgetSuggestions: WidgetType[];
}

export interface AIGenerateResponse {
  name: string;
  description?: string;
  visibility: DashboardVisibility;
  widgets: Array<{
    widgetKey: WidgetType;
    title: string;
    config: Record<string, any>;
    layout: { x: number; y: number; w: number; h: number };
  }>;
}

export type OperationalDashboardScope = "home" | "workspace";

export type DashboardCardCategory =
  | "featured"
  | "tasks"
  | "project-health"
  | "resources"
  | "governance"
  | "ai-insights";

export interface DashboardCardDefinition {
  cardKey: string;
  title: string;
  description: string;
  category: DashboardCardCategory;
  supportedScopes: OperationalDashboardScope[];
  defaultDisplayType: "metric" | "chart" | "table";
  defaultSize: "small" | "medium" | "large";
  drilldownRouteTemplate: string;
  resolverKey: string;
}

export interface DashboardCardData {
  cardKey: string;
  scopeType: OperationalDashboardScope;
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
  cardKey: string;
  title: string;
  displayType: "metric" | "chart" | "table";
  size: "small" | "medium" | "large";
  data: DashboardCardData;
}

export interface OperationalDashboardResponse {
  id: string;
  scopeType: OperationalDashboardScope;
  scopeId: string;
  title: string;
  cards: DashboardCardInstance[];
}

export interface DashboardCardsCatalogResponse {
  home: Record<DashboardCardCategory, DashboardCardDefinition[]>;
  workspace: Record<DashboardCardCategory, DashboardCardDefinition[]>;
}

export interface CardAdvisoryResponse {
  advisoryType: string | null;
  cardKey: string;
  summary: string;
  drivers: string[];
  visibilityScope: "full" | "project_only" | "viewer_restricted";
  affectedEntityCount: number;
  affectedEntities: Array<{
    type: "project" | "program" | "portfolio";
    id: string;
    name: string;
  }>;
  recommendedActions: string[];
  generatedFromTimestamp: string | null;
}

