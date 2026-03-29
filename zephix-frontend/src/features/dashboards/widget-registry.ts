// Phase 4.3: Widget Registry
import type { WidgetType, DashboardWidget } from "./types";

export interface WidgetRegistryEntry {
  defaultConfig: Record<string, any>;
  defaultLayout: { x: number; y: number; w: number; h: number };
  category: string;
  displayName: string;
  description: string;
}

// Widget registry mapping widget types to their defaults
export const widgetRegistry: Record<WidgetType, WidgetRegistryEntry> = {
  project_health: {
    defaultConfig: {},
    defaultLayout: { x: 0, y: 0, w: 4, h: 3 },
    category: "Analytics",
    displayName: "Project Health",
    description: "Shows project health metrics and status",
  },
  sprint_metrics: {
    defaultConfig: {},
    defaultLayout: { x: 4, y: 0, w: 4, h: 3 },
    category: "Analytics",
    displayName: "Sprint Metrics",
    description: "Sprint velocity and completion metrics",
  },
  resource_utilization: {
    defaultConfig: {},
    defaultLayout: { x: 0, y: 3, w: 6, h: 4 },
    category: "Resources",
    displayName: "Resource Utilization",
    description: "Resource allocation and utilization percentages",
  },
  conflict_trends: {
    defaultConfig: {},
    defaultLayout: { x: 6, y: 3, w: 6, h: 4 },
    category: "Resources",
    displayName: "Conflict Trends",
    description: "Resource conflict trends over time",
  },
  portfolio_summary: {
    defaultConfig: {},
    defaultLayout: { x: 0, y: 7, w: 6, h: 4 },
    category: "Portfolio",
    displayName: "Portfolio Summary",
    description: "Portfolio-level metrics and summaries",
  },
  program_summary: {
    defaultConfig: {},
    defaultLayout: { x: 6, y: 7, w: 6, h: 4 },
    category: "Portfolio",
    displayName: "Program Summary",
    description: "Program-level metrics and summaries",
  },
  budget_variance: {
    defaultConfig: {},
    defaultLayout: { x: 0, y: 11, w: 6, h: 3 },
    category: "Finance",
    displayName: "Budget Variance",
    description: "Budget vs actual spending variance",
  },
  risk_summary: {
    defaultConfig: {},
    defaultLayout: { x: 6, y: 11, w: 6, h: 3 },
    category: "Risk",
    displayName: "Risk Summary",
    description: "Risk assessment and mitigation status",
  },
  recent_projects: {
    defaultConfig: {},
    defaultLayout: { x: 0, y: 14, w: 6, h: 4 },
    category: "Workspace",
    displayName: "Recent Projects",
    description: "Latest projects in this workspace",
  },
  project_status_summary: {
    defaultConfig: {},
    defaultLayout: { x: 6, y: 14, w: 6, h: 4 },
    category: "Workspace",
    displayName: "Project Status Summary",
    description: "Project counts grouped by status",
  },
  upcoming_milestones: {
    defaultConfig: {},
    defaultLayout: { x: 0, y: 18, w: 4, h: 4 },
    category: "Workspace",
    displayName: "Upcoming Milestones",
    description: "Milestones due soon",
  },
  open_risks: {
    defaultConfig: {},
    defaultLayout: { x: 4, y: 18, w: 4, h: 4 },
    category: "Workspace",
    displayName: "Open Risks",
    description: "Current open risks for workspace projects",
  },
  documents_summary: {
    defaultConfig: {},
    defaultLayout: { x: 8, y: 18, w: 4, h: 4 },
    category: "Workspace",
    displayName: "Documents Summary",
    description: "Workspace document totals and recent items",
  },
  kpi: {
    defaultConfig: {},
    defaultLayout: { x: 0, y: 14, w: 4, h: 3 },
    category: "Analytics",
    displayName: "KPI Dashboard",
    description: "Key Performance Indicators overview",
  },
  // Phase 2B: Waterfall core widgets
  critical_path_risk: {
    defaultConfig: {},
    defaultLayout: { x: 4, y: 14, w: 4, h: 3 },
    category: "Schedule",
    displayName: "Critical Path Risk",
    description: "Critical tasks at risk, path slip summary",
  },
  earned_value_summary: {
    defaultConfig: {},
    defaultLayout: { x: 8, y: 14, w: 4, h: 3 },
    category: "Finance",
    displayName: "Earned Value Summary",
    description: "CPI, SPI, and latest earned value snapshot",
  },
  projects_at_risk: {
    defaultConfig: {},
    defaultLayout: { x: 0, y: 0, w: 4, h: 4 },
    category: "Analytics",
    displayName: "Projects At Risk",
    description: "Projects with SPI < 0.9, CPI < 0.9, or critical risks",
  },
  overdue_tasks: {
    defaultConfig: {},
    defaultLayout: { x: 4, y: 0, w: 4, h: 4 },
    category: "Workspace",
    displayName: "Overdue Tasks",
    description: "Tasks past due date across all projects",
  },
};

/**
 * Create a new widget with default config and layout
 */
export function createWidget(type: WidgetType, position?: { x: number; y: number }): DashboardWidget {
  const registry = widgetRegistry[type];
  const layout = position
    ? { ...registry.defaultLayout, x: position.x, y: position.y }
    : registry.defaultLayout;

  return {
    id: crypto.randomUUID(),
    type,
    title: registry.displayName,
    layout,
    config: { ...registry.defaultConfig },
  };
}

/**
 * Get all widget types grouped by category
 */
export function getWidgetsByCategory(): Record<string, WidgetType[]> {
  const byCategory: Record<string, WidgetType[]> = {};

  Object.entries(widgetRegistry).forEach(([type, entry]) => {
    if (!byCategory[entry.category]) {
      byCategory[entry.category] = [];
    }
    byCategory[entry.category].push(type as WidgetType);
  });

  return byCategory;
}


