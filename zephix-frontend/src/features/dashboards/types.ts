// Phase 4.3 Dashboard Types
// Strict types matching backend DTOs

export type DashboardVisibility = "WORKSPACE" | "ORG" | "PRIVATE";

// Widget allowlist matching backend
export type WidgetType =
  | "project_health"
  | "sprint_metrics"
  | "sprint_progress"
  | "resource_utilization"
  | "conflict_trends"
  | "portfolio_summary"
  | "program_summary"
  | "budget_variance"
  | "risk_summary"
  | "kpi";

export interface DashboardLayoutItem {
  i: string; // widget id
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

export interface DashboardEntity {
  id: string;
  name: string;
  description?: string;
  visibility: DashboardVisibility;
  workspaceId: string;
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

