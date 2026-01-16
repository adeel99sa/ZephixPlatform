# Phase 7.5: Dashboards Controllers Plan

**Goal:** Dashboard data reads activeKpiIds and renders only active KPIs. No manual status updates. Use signals you already compute.

---

## Sequence A: Backend Controllers First

### 1. Create Dashboard Read Endpoints

**File:** `zephix-backend/src/modules/dashboards/controllers/project-dashboard.controller.ts`

**Endpoints:**

```typescript
@Controller('dashboards/project')
@UseGuards(JwtAuthGuard)
export class ProjectDashboardController {
  // GET /api/dashboards/project/:projectId/summary
  @Get(':projectId/summary')
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getProjectSummary(
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    // Returns: health, behindTargetDays, counts, overdue, blocked
  }

  // GET /api/dashboards/project/:projectId/kpis
  @Get(':projectId/kpis')
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getProjectKPIs(
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    // Returns: active KPIs only, include definitions plus current values
  }

  // GET /api/dashboards/project/:projectId/work
  @Get(':projectId/work')
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getProjectWork(
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    // Returns: phase rollups, status counts, top blockers
  }
}
```

**Inputs:**
- `projectId` path param
- `x-workspace-id` header (required, validated)

**Outputs:**
- Summary: health, behindTargetDays, counts, overdue, blocked
- KPIs: active KPIs only, include definitions plus current values if available
- Work: phase rollups, status counts, top blockers

---

## Sequence B: Service Layer Rules

### 2. Create Dashboard Service

**File:** `zephix-backend/src/modules/dashboards/services/project-dashboard.service.ts`

**Rules:**

1. **Use Project.activeKpiIds as the filter**
   ```typescript
   const project = await this.projectsService.findProjectById(...);
   const activeKpiIds = project.activeKpiIds || [];
   ```

2. **For each KPI id:**
   - If computed: derive from existing work signals
   - If manual: return null value until manual entry is implemented

3. **Enforce workspace access for every request**
   ```typescript
   await this.workspaceAccessService.requireWorkspaceAccess(
     workspaceId,
     auth.userId,
     auth.userRole,
   );
   ```

4. **Normalize response shape via ResponseService**
   ```typescript
   return this.responseService.success({
     summary: { ... },
     kpis: [...],
     work: { ... }
   });
   ```

**KPI Value Calculation Logic:**

```typescript
async getProjectKPIData(projectId: string, activeKpiIds: string[]): Promise<KPIData[]> {
  const project = await this.findProject(projectId);
  const availableKPIs = await this.getAvailableKPIs(project);

  // Filter to only active KPIs
  const activeKPIs = availableKPIs.filter(kpi => activeKpiIds.includes(kpi.id));

  return activeKPIs.map(kpi => {
    if (kpi.calculationMethod || kpi.type === 'computed') {
      // Compute from work signals
      return {
        ...kpi,
        currentValue: this.computeKPIValue(kpi, project),
        lastUpdated: new Date(),
      };
    } else {
      // Manual - return null until manual entry implemented
      return {
        ...kpi,
        currentValue: null,
        lastUpdated: null,
      };
    }
  });
}
```

**Computed KPI Examples:**
- Task completion rate: `(doneTasks / totalTasks) * 100`
- On-time delivery: `(tasksCompletedOnTime / totalTasks) * 100`
- Average cycle time: `sum(completedAt - startedAt) / completedTasks`

---

## Sequence C: Frontend Dashboards Surface

### 3. Update Project Overview

**File:** `zephix-frontend/src/features/projects/overview/ProjectOverviewPage.tsx`

**Add Dashboard Section:**

```typescript
// After KPI Panel, add:
<ProjectDashboardSection
  projectId={projectId!}
  workspaceId={workspaceId}
  activeKpiIds={activeKpiIds} // Pass from KPI panel state
/>
```

**File:** `zephix-frontend/src/features/projects/components/ProjectDashboardSection.tsx`

**Features:**
- Health status (already exists, keep it)
- Work counts (tasks by status)
- Active KPIs list with value or placeholder
- Read-only for MVP

**KPI Display:**
```typescript
{activeKPIs.map(kpi => (
  <div key={kpi.id}>
    <h4>{kpi.name}</h4>
    {kpi.currentValue !== null ? (
      <span>{kpi.currentValue} {kpi.unit}</span>
    ) : (
      <span className="text-gray-400">Not yet measured</span>
    )}
  </div>
))}
```

---

## Acceptance Checks for Phase 7.5

✅ **Dashboard endpoints return 200 for Admin and Member with workspace access**
- Test with Admin user
- Test with Member user
- Both should get 200 OK

✅ **Dashboard endpoints return 403 for users without workspace access**
- Test with user not in workspace
- Should get 403 Forbidden

✅ **Dashboard KPIs output only includes KPIs present in activeKpiIds**
- Toggle KPIs on/off
- Refresh dashboard
- Only active KPIs appear

✅ **Toggling KPIs changes dashboard output after refresh**
- Toggle KPI on → appears in dashboard
- Toggle KPI off → disappears from dashboard

---

## Implementation Order

1. **Backend Service** (`project-dashboard.service.ts`)
   - Implement KPI filtering logic
   - Implement computed KPI calculations
   - Add workspace access checks

2. **Backend Controller** (`project-dashboard.controller.ts`)
   - Add three endpoints
   - Wire to service
   - Add guards and validation

3. **Frontend API Client**
   - Add dashboard API methods
   - Handle ResponseService wrapper

4. **Frontend Component** (`ProjectDashboardSection.tsx`)
   - Fetch dashboard data
   - Display summary, KPIs, work stats
   - Filter KPIs by activeKpiIds prop

5. **Wire to Overview Page**
   - Add dashboard section
   - Pass activeKpiIds from KPI panel state

---

## Next Steps After Phase 7.5

- Commit 6: Render KPI cards for active KPIs on project overview
- Commit 7: Add Manual KPI value entry for active manual KPIs
- Commit 8: Add computed KPI calculations (if not done in Phase 7.5)

---

**Status:** Ready for implementation after MVP smoke test passes.
