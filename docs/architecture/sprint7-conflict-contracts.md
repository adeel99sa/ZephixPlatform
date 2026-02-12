# Sprint 7 — Conflict Contract Capture

## Current Conflict Architecture (Pre-Sprint 7)

### Data Sources
| Source | Entity | Purpose |
|--------|--------|---------|
| WorkResourceAllocation | work_resource_allocations | Canonical project allocations (userId, allocationPercent, availabilityPercent, dates) |
| ResourceAllocation | resource_allocations | Secondary allocations (resourceId, allocationPercentage, type: HARD/SOFT/GHOST) |
| ResourceConflict | resource_conflicts | Persisted conflict snapshots (hourly cron + real-time on mutation) |

### Conflict Generation Paths
1. **Cron Job**: `ResourceConflictService.detectConflicts()` — runs every hour, scans ResourceAllocation for next 30 days, writes ResourceConflict rows when total > 100%
2. **On Mutation**: `ResourceAllocationService.recomputeConflicts()` — called on create/update/delete of ResourceAllocation, upserts conflict rows
3. **Pre-creation Check**: `ResourceConflictService.checkAllocationConflicts()` — validation only, no writes

### Consumer Endpoints and Response Shapes

#### 1. Analytics — Project Health
- **Path**: `GET /analytics/widgets/project-health`
- **Consumer**: `AnalyticsConflictsService.getProjectHealth()` (Sprint 6.2)
- **Response**:
```json
[{
  "projectId": "uuid",
  "projectName": "string",
  "status": "string",
  "riskLevel": "string | null",
  "conflictCount": 0
}]
```
- **Frontend**: `project-health.tsx` dashboard widget

#### 2. Analytics — Conflict Trends
- **Path**: `GET /analytics/widgets/conflict-trends?startDate=&endDate=`
- **Consumer**: `AnalyticsConflictsService.getConflictTrends()` (Sprint 6.2)
- **Response**:
```json
[{ "week": "2026-01-05", "count": 3 }]
```
- **Frontend**: `conflict-trends.tsx` dashboard widget

#### 3. Heatmap (Legacy)
- **Path**: `GET /resources/heat-map?startDate=&endDate=&projectId=&view=`
- **Consumer**: `ResourceHeatMapService.getHeatMapData()` — reads ResourceAllocation only
- **Response**:
```json
[{
  "resourceId": "uuid",
  "weeks": [{
    "weekStart": "2026-01-05",
    "totalAllocation": 85,
    "projects": [{ "projectId": "uuid", "allocation": 85 }],
    "status": "optimal"
  }]
}]
```
- **Status thresholds (HARDCODED)**: available ≤80, optimal ≤100, warning ≤120, critical >120
- **Frontend**: `ResourceHeatMap.tsx` (legacy)

#### 4. Heatmap (Timeline)
- **Path**: `GET /resources/heatmap/timeline?fromDate=&toDate=&workspaceId=`
- **Consumer**: `ResourceTimelineService.getHeatmap()`
- **Response**:
```json
[{
  "date": "2026-01-05",
  "resources": [{
    "resourceId": "uuid",
    "resourceName": "string",
    "hardLoad": 80,
    "softLoad": 20,
    "classification": "WARNING"
  }]
}]
```
- **Frontend**: `ResourceHeatmapPage.tsx`, `ResourceHeatmapGrid.tsx`, `ResourceHeatmapCell.tsx`

#### 5. Resource Conflicts CRUD
- **Path**: `GET /resources/conflicts?workspaceId=&severity=&resolved=`
- **Consumer**: `ResourcesService.getConflictsFromEntity()`
- **Path**: `PATCH /resources/conflicts/:id/resolve`
- **Path**: `PATCH /resources/conflicts/:id/reopen`

#### 6. Risk Score (via Sprint 6.2 provider)
- **Consumer**: `ResourceRiskScoreService` via `CONFLICT_SIGNAL_PROVIDER`
- **Contract**: `{ count: number, maxSeverity: 'low'|'medium'|'high'|'critical'|null }`

#### 7. Program/Portfolio Rollups
- **Consumer**: `ProgramsRollupService.calculateRollupTotals()` — reads ResourceConflict, filters by affectedProjects
- **Consumer**: `PortfoliosRollupService.calculateRollupTotals()` — same pattern
- **Output field**: `resourceConflictsOpen: number`

### Hardcoded Thresholds to Replace
| Location | Values | Sprint 7 Policy Key |
|----------|--------|---------------------|
| `ResourceHeatMapService.getAllocationStatus()` | 80/100/120 | resource_conflict_threshold_warn, resource_conflict_threshold_block |
| `ResourceConflictService.calculateSeverity()` | 110/125/150 | Same |
| `ResourceConflictService.detectConflicts()` | >100 | resource_conflict_threshold_warn |
| `ResourceConflictService.checkAllocationConflicts()` | >100 | resource_conflict_threshold_warn |
| `ResourceRiskScoreService.computeRiskScore()` | 80/100/120/150 | Uses its own scoring, conflict signal weight via resource_conflict_weight |

### Sprint 7 Cutover Plan
1. New engine computes weekly conflict slices from WorkResourceAllocation + ResourceAllocation overlays
2. Engine replaces: AnalyticsConflictsService data source, heatmap status derivation, conflict signal provider
3. Cron job disabled by default (env var)
4. ResourceConflict entity remains for historical reporting only
