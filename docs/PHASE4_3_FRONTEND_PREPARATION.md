# Phase 4.3 Frontend Dashboard Studio UX - Preparation

## Current Frontend Structure

### Routes (from `src/App.tsx`)
```typescript
/dashboards                    → DashboardsIndex (list view)
/dashboards/:id                → DashboardView (view mode)
/dashboards/:id/edit           → DashboardBuilder (edit mode)
```

### Components

**Views** (`src/views/dashboards/`):
- `Index.tsx` - Dashboard list/index page
- `View.tsx` - Dashboard view page (read-only)
- `Builder.tsx` - Dashboard builder/editor

**Features** (`src/features/dashboards/`):
- `api.ts` - Dashboard API client
- `useDashboards.ts` - Dashboard React hooks
- `widgetQueryApi.ts` - Widget query API
- `DashboardCreateModal.tsx` - Create dashboard modal
- `FiltersBar.tsx` - Filter bar component
- `ShareDialog.tsx` - Share dialog component
- `useAutosave.ts` - Autosave hook
- `filters.ts` - Filter utilities
- `widgets/WidgetRenderer.tsx` - Widget renderer
- `widgets/format.ts` - Widget formatting utilities

**Components**:
- `src/components/dashboards/DashboardSwitcher.tsx` - Dashboard switcher
- `src/components/dashboard/` - Legacy dashboard components (may need migration)

### API Integration

**Backend Endpoints Available** (from Phase 4.2):
- `GET /api/dashboards/templates` - List dashboard templates
- `POST /api/dashboards/activate-template` - Activate a template
- `GET /api/dashboards` - List dashboards
- `GET /api/dashboards/:id` - Get dashboard details
- `POST /api/dashboards` - Create dashboard
- `PATCH /api/dashboards/:id` - Update dashboard
- `DELETE /api/dashboards/:id` - Delete dashboard
- `GET /api/analytics/widgets/project-health` - Project health widget data
- `GET /api/analytics/widgets/resource-utilization` - Resource utilization widget data
- `GET /api/analytics/widgets/conflict-trends` - Conflict trends widget data
- `POST /api/ai/dashboards/suggest` - AI suggest templates/widgets
- `POST /api/ai/dashboards/generate` - AI generate dashboard schema

### Phase 4.3 Requirements

**Template Gallery**:
- Display all 5 templates with preview cards
- Show template persona, methodology, and widget count
- One-click activation

**Widget Picker**:
- Enforce allowlist (project_health, sprint_metrics, resource_utilization, conflict_trends, portfolio_summary, program_summary, budget_variance, risk_summary)
- Show widget previews
- Filter by category

**Drag and Drop Layout**:
- Grid-based layout system (12 columns)
- Widget positioning (x, y, w, h)
- Resize handles
- Auto-save on layout change

**Save and Share**:
- Save dashboard with visibility settings (ORG, WORKSPACE, PRIVATE)
- Share dialog with workspace/org scope
- Role-based visibility controls

**AI Copilot Integration**:
- AI suggest UI (persona-based template/widget suggestions)
- AI generate UI (prompt-based dashboard generation)
- Schema validation feedback

## Next Steps

Ready for Phase 4.3 implementation. Frontend structure is in place. Backend APIs are verified and working.


