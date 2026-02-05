# Phase 4.2 Dashboard Studio Documentation

## Overview

Dashboard Studio enables users to create, customize, and share dashboards with analytics widgets. It includes pre-built templates, AI-powered suggestions, and custom metric definitions.

## Templates

Dashboard templates are pre-configured dashboards for specific personas and methodologies:

- **exec_overview**: Executive-level portfolio and program rollups
- **pmo_delivery_health**: PMO delivery health metrics
- **program_rollup**: Program manager dashboard
- **pm_agile_sprint**: Project manager agile/sprint dashboard
- **resource_utilization_conflicts**: Resource manager dashboard

Each template includes:
- Default visibility (ORG or WORKSPACE)
- Pre-configured widgets with default layouts
- Widget configurations optimized for the persona

## Widgets

### Widget Allowlist

Only the following widget keys are allowed:
- `project_health`
- `sprint_metrics`
- `resource_utilization`
- `conflict_trends`
- `budget_variance`
- `risk_summary`
- `portfolio_summary`
- `program_summary`

### Widget Structure

Each widget has:
- `widgetKey`: Must be in allowlist
- `title`: Display title
- `config`: JSON object with widget-specific configuration
- `layout`: Grid layout with `x`, `y`, `w`, `h` (numeric values)

## Workspace Scoping Rules

### Dashboard Visibility

- **PRIVATE**: Only owner can access
- **WORKSPACE**: Requires `x-workspace-id` header and workspace access
- **ORG**: Accessible to all org members (no workspace header required)

### Workspace Requirements

- WORKSPACE visibility dashboards require `x-workspace-id` header
- Analytics widget endpoints always require `x-workspace-id` header (even for org-level data)
- Template activation for WORKSPACE templates requires `x-workspace-id` header

## Activation Flow

1. User selects a template (via `/api/dashboards/templates`)
2. User activates template (via `/api/dashboards/activate-template`)
3. System creates dashboard with `isTemplateInstance: true`
4. System creates widgets from template definition in a transaction
5. Dashboard is returned with widgets ordered by layout

## API Endpoints

### Dashboards

- `GET /api/dashboards` - List dashboards (filtered by visibility and workspace)
- `POST /api/dashboards` - Create dashboard
- `GET /api/dashboards/:id` - Get dashboard with widgets
- `PATCH /api/dashboards/:id` - Update dashboard
- `DELETE /api/dashboards/:id` - Delete dashboard (soft delete)

### Widgets

- `POST /api/dashboards/:id/widgets` - Add widget to dashboard
- `PATCH /api/dashboards/:id/widgets/:widgetId` - Update widget
- `DELETE /api/dashboards/:id/widgets/:widgetId` - Delete widget

### Templates

- `GET /api/dashboards/templates` - List available templates
- `POST /api/dashboards/activate-template` - Activate template and create dashboard

### Analytics Widgets

- `GET /api/analytics/widgets/project-health` - Project health data
- `GET /api/analytics/widgets/sprint-metrics` - Sprint metrics (501 if not configured)
- `GET /api/analytics/widgets/resource-utilization` - Resource utilization data
- `GET /api/analytics/widgets/conflict-trends` - Conflict trends by week
- `GET /api/analytics/widgets/portfolio-summary` - Portfolio summary (requires portfolioId query param)
- `GET /api/analytics/widgets/program-summary` - Program summary (requires programId query param)

### AI Copilot

- `POST /api/ai/dashboards/suggest` - Suggest template and widgets based on persona
- `POST /api/ai/dashboards/generate` - Generate dashboard configuration from prompt

### Metrics

- `GET /api/metrics` - List metric definitions
- `POST /api/metrics` - Create metric definition
- `GET /api/metrics/:id` - Get metric definition
- `PATCH /api/metrics/:id` - Update metric definition
- `DELETE /api/metrics/:id` - Delete metric definition

## Route Order

Static routes must come before dynamic `:id` routes:

1. `GET /api/dashboards`
2. `POST /api/dashboards`
3. `GET /api/dashboards/templates` (static)
4. `POST /api/dashboards/activate-template` (static)
5. `GET /api/dashboards/:id`
6. `PATCH /api/dashboards/:id`
7. `DELETE /api/dashboards/:id`
8. `POST /api/dashboards/:id/widgets`
9. `PATCH /api/dashboards/:id/widgets/:widgetId`
10. `DELETE /api/dashboards/:id/widgets/:widgetId`

## AI Copilot

### Suggest

Rules-based template suggestion (no LLM yet):
- RESOURCE_MANAGER → `resource_utilization_conflicts`
- PMO → `pmo_delivery_health`
- EXEC → `exec_overview`
- PROGRAM_MANAGER → `program_rollup`
- PROJECT_MANAGER (AGILE/SCRUM) → `pm_agile_sprint`
- DELIVERY_LEAD → `pmo_delivery_health`

### Generate

Keyword-based dashboard generation (deterministic, no free-form):
- "utilization" → includes `resource_utilization` widget
- "conflict" → includes `conflict_trends` widget
- "portfolio" → includes `portfolio_summary` widget
- "program" → includes `program_summary` widget
- Always includes `project_health` widget

Output is validated against widget allowlist and layout schema.

