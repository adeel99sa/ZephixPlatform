// Phase 4.3 Dashboard Zod Schemas
import { z } from "zod";

// Widget allowlist
const WIDGET_ALLOWLIST = [
  "project_health",
  "sprint_metrics",
  "resource_utilization",
  "conflict_trends",
  "portfolio_summary",
  "program_summary",
  "budget_variance",
  "risk_summary",
  "recent_projects",
  "project_status_summary",
  "upcoming_milestones",
  "open_risks",
  "documents_summary",
  "kpi",
  // Phase 2B: Waterfall core
  "critical_path_risk",
  "earned_value_summary",
] as const;

export const WidgetTypeSchema = z.enum(WIDGET_ALLOWLIST as unknown as [string, ...string[]]);

export const DashboardVisibilitySchema = z.enum(["WORKSPACE", "ORG", "PRIVATE"]);

export const DashboardLayoutSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20),
});

export const DashboardWidgetConfigSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

export const WidgetDataSourceSchema = z.object({
  kind: z.enum([
    "kpi_cards",
    "project_health_list",
    "risk_summary",
    "budget_summary",
    "resource_utilization",
    "recent_projects",
    "project_status_summary",
    "upcoming_milestones",
    "open_risks",
    "documents_summary",
  ]),
  metricKey: z.string().min(1).optional(),
  projectId: z.string().uuid().optional(),
});

export const DashboardLayoutConfigSchema = z.object({
  version: z.literal(1),
  grid: z.object({
    columns: z.literal(12),
    rowHeight: z.number().int().min(16).max(96),
  }),
  widgets: z.array(
    z.object({
      id: z.string().uuid(),
      type: z.enum([
        "kpi_cards",
        "project_health_list",
        "risk_summary",
        "budget_summary",
        "resource_utilization",
        "recent_projects",
        "project_status_summary",
        "upcoming_milestones",
        "open_risks",
        "documents_summary",
      ]),
      title: z.string().min(1).max(200),
      layout: DashboardLayoutSchema,
      config: DashboardWidgetConfigSchema,
      dataSource: WidgetDataSourceSchema.optional(),
    }),
  ),
});

export const DashboardWidgetSchema = z.object({
  id: z.string().uuid(),
  type: WidgetTypeSchema,
  title: z.string().min(1).max(200),
  layout: DashboardLayoutSchema,
  config: DashboardWidgetConfigSchema,
  dataSource: z.union([z.string(), WidgetDataSourceSchema]).optional(),
});

export const SharedDashboardWidgetSchema = z.object({
  id: z.string().uuid(),
  type: WidgetTypeSchema,
  title: z.string().min(1).max(200),
  layout: DashboardLayoutSchema,
  config: z.record(z.string(), z.any()).default({}),
});

export const DashboardEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  visibility: DashboardVisibilitySchema,
  workspaceId: z.string().uuid(),
  createdBy: z.string().uuid().optional(),
  layoutConfig: DashboardLayoutConfigSchema.optional(),
  widgets: z.array(DashboardWidgetSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  shareToken: z.string().uuid().nullable().optional(),
  shareEnabled: z.boolean().optional(),
  shareExpiresAt: z.string().nullable().optional(),
});

export const SharedDashboardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  visibility: DashboardVisibilitySchema.optional(),
  widgets: z.array(SharedDashboardWidgetSchema),
});

export const DashboardTemplateSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  persona: z.string(),
  methodology: z.string().optional(),
  definition: z.object({
    widgets: z.array(
      z.object({
        widgetKey: WidgetTypeSchema,
        title: z.string(),
        config: z.record(z.string(), z.any()),
        layout: DashboardLayoutSchema,
      })
    ),
  }),
});

export const AISuggestResponseSchema = z.object({
  templateKey: z.string(),
  widgetSuggestions: z.array(WidgetTypeSchema),
});

export const AIGenerateResponseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  visibility: DashboardVisibilitySchema,
  widgets: z.array(
    z.object({
      widgetKey: WidgetTypeSchema,
      title: z.string(),
      config: z.record(z.string(), z.any()),
      layout: DashboardLayoutSchema,
    })
  ),
});

// Custom error for workspace required
export class WorkspaceRequiredError extends Error {
  constructor() {
    super("Workspace ID is required. Please select a workspace.");
    this.name = "WorkspaceRequiredError";
  }
}

