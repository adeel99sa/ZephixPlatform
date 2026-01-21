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
] as const;

export const WidgetTypeSchema = z.enum(WIDGET_ALLOWLIST as [string, ...string[]]);

export const DashboardVisibilitySchema = z.enum(["WORKSPACE", "ORG", "PRIVATE"]);

export const DashboardLayoutSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20),
});

export const DashboardWidgetSchema = z.object({
  id: z.string().uuid(),
  type: WidgetTypeSchema,
  title: z.string().min(1).max(200),
  layout: DashboardLayoutSchema,
  config: z.record(z.any()),
  dataSource: z.string().optional(),
});

export const SharedDashboardWidgetSchema = z.object({
  id: z.string().uuid(),
  type: WidgetTypeSchema,
  title: z.string().min(1).max(200),
  layout: DashboardLayoutSchema,
  config: z.record(z.any()).optional().default({}),
});

export const DashboardEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  visibility: DashboardVisibilitySchema,
  workspaceId: z.string().uuid(),
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
        config: z.record(z.any()),
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
      config: z.record(z.any()),
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

