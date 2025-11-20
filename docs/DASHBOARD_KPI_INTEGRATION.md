# Dashboard KPI Integration Complete

## What Was Wired

### 1. Data Fetching in DashboardView
- Added import for `getProjectsCountByWorkspace`
- Detects KPI widgets with `source: "projects.countByWorkspace"`
- Fetches count from backend endpoint
- Merges KPI data with generic widget data
- Uses local cache to prevent duplicate requests

### 2. Widget Renderer Updates
- Updated KPI rendering to format numbers properly
- Uses `toLocaleString()` for thousand separators
- Supports trend arrows
- Clean layout with label + value

### 3. Telemetry Events
- Added `kpi.projects_count.fetched` - tracks when data is fetched
- Added `kpi.projects_count.viewed` - tracks when widget is viewed
- Includes context: workspaceId, widgetId, count value

## How It Works

1. Dashboard loads with widgets
2. System detects `type: 'kpi'` and `source: 'projects.countByWorkspace'`
3. Extracts `workspaceId` from widget config
4. Calls `/api/projects/stats/by-workspace/{workspaceId}`
5. Backend queries DB with org + workspace scoping
6. Returns count (excludes soft-deleted projects)
7. Frontend formats and displays in widget

## Widget Config Format

```json
{
  "id": "w-kpi-projects",
  "type": "kpi",
  "config": {
    "source": "projects.countByWorkspace",
    "label": "Projects",
    "workspaceId": "<workspace-uuid>"
  }
}
```

## Performance

- **Single COUNT query**: Fast (<100ms)
- **Indexed lookup**: Uses composite index (org + workspace)
- **Local caching**: Per-view cache prevents duplicate API calls
- **Soft-delete aware**: Excludes deleted projects

## Testing

E2E tests validate:
- Mock: KPI endpoint returns expected shape
- Real: KPI increments after creating project
- See: `zephix-e2e/tests/kpi-projects-*.spec.ts`

## Extensibility

To add more KPI sources:
1. Add endpoint: `/api/{resource}/stats/by-workspace/:workspaceId`
2. Add API helper in `features/{resource}/api.ts`
3. Add detection in DashboardView effect
4. Add to telemetry types

## Usage Example

Create a dashboard widget via API or Builder:

```bash
curl -X POST $API/dashboards/$ID/widgets \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "kpi",
    "config": {
      "source": "projects.countByWorkspace",
      "label": "Active Projects",
      "workspaceId": "<ws-uuid>"
    }
  }'
```

## Security

- ✅ Tenant scoped (org + workspace)
- ✅ Auth required (JWT guard)
- ✅ Excludes soft-deleted projects
- ✅ RESTRICT on FK prevents orphaned data

