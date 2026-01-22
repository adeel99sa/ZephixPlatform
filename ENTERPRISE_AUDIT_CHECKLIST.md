# Enterprise Standards Audit Checklist

**Date:** January 15, 2026
**Purpose:** Verify correctness, integration risks, and quality gates before MVP testers

---

## A) Correctness and Integration Risks

### 1. API Client Consistency

**Risk:** Multiple API clients causing header/base path drift

**Check:**
```bash
# Search for all API client imports
grep -r "import.*api.*from" zephix-frontend/src --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**Files to Verify:**
- [ ] `zephix-frontend/src/services/api.ts` - Main client with x-workspace-id interceptor
- [ ] `zephix-frontend/src/lib/api/client.ts` - Alternative client (should be deprecated or unified)
- [ ] All feature files use the same client

**Pass Criteria:**
- Only one HTTP client used across features
- All imports point to `services/api.ts` or a centralized barrel export
- No mixing of `api` from different sources

**Fix if Failed:**
- Create barrel export: `zephix-frontend/src/services/api/index.ts`
- Update all imports to use barrel
- Deprecate `lib/api/client.ts` or remove it

---

### 2. Workspace Header Source of Truth

**Risk:** Workspace ID read from inconsistent storage locations

**Check:**
```bash
# Find all places reading workspace ID
grep -r "workspace-storage\|activeWorkspaceId\|getWorkspaceId" zephix-frontend/src --include="*.ts" --include="*.tsx"
```

**Files to Verify:**
- [ ] `zephix-frontend/src/services/api.ts` - Interceptor reads from workspace-storage
- [ ] `zephix-frontend/src/state/workspace.store.ts` - Source of truth for activeWorkspaceId
- [ ] No direct localStorage reads outside store

**Pass Criteria:**
- Single helper function: `getActiveWorkspaceId()`
- Interceptor calls helper only
- If workspace not selected, UI shows clear message, no request spam

**Fix if Failed:**
- Create `zephix-frontend/src/utils/workspace.ts`:
  ```typescript
  export function getActiveWorkspaceId(): string | null {
    const store = useWorkspaceStore.getState();
    return store.activeWorkspaceId;
  }
  ```
- Update interceptor to use helper
- Add UI guard component for workspace-required routes

---

### 3. Role Enforcement for KPI Toggles

**Risk:** UI disables toggles but backend doesn't enforce

**Backend Check:**
```bash
# Verify PATCH endpoint has role guard
grep -A 10 "PATCH.*:id/kpis" zephix-backend/src/modules/projects/projects.controller.ts
```

**Files to Verify:**
- [ ] `zephix-backend/src/modules/projects/projects.controller.ts` - PATCH endpoint
- [ ] Uses `RequireWorkspaceRole` guard with write permission
- [ ] Service layer also checks permissions

**Pass Criteria:**
- Viewer sends PATCH and gets 403 Forbidden
- Error message is clear: "You do not have permission to update KPIs"

**Test:**
```bash
# As viewer user
curl -X PATCH http://localhost:3001/api/projects/:id/kpis \
  -H "Authorization: Bearer <viewer-token>" \
  -H "x-workspace-id: <workspace-id>" \
  -d '{"activeKpiIds": ["kpi-1"]}'
# Expected: 403 Forbidden
```

---

### 4. Project KPI Definition Source

**Risk:** Empty KPI list confuses testers if template missing

**Check:**
```bash
# Verify KPI loading logic handles all cases
grep -A 20 "getProjectKPIs\|availableKPIs" zephix-backend/src/modules/projects/services/projects.service.ts
```

**Files to Verify:**
- [ ] `zephix-backend/src/modules/projects/services/projects.service.ts` - getProjectKPIs method
- [ ] Handles: templateSnapshot → templateId → empty list
- [ ] Returns clear message if no KPIs available

**Pass Criteria:**
- Every project has stable KPI definition source
- Empty list returns with clear message: "No KPIs available for this project template"
- Frontend shows helpful message, not just empty state

**Fix if Failed:**
- Add fallback to org default KPIs if template missing
- Or return empty with explicit message

---

### 5. Data Model Drift: Template → Project

**Risk:** Template instantiation doesn't set activeKpiIds from defaultEnabledKPIs

**Check:**
```bash
# Find template instantiation code
grep -r "defaultEnabledKPIs\|activeKpiIds" zephix-backend/src/modules/templates --include="*.ts"
```

**Files to Verify:**
- [ ] Template instantiation service sets `Project.activeKpiIds = template.defaultEnabledKPIs`
- [ ] Happens during project creation, not after

**Pass Criteria:**
- New project from template shows default KPIs already toggled ON
- No extra clicks needed to activate default KPIs

**Fix if Failed:**
- Update `TemplatesInstantiateV51Service` or instantiation service
- Set `project.activeKpiIds = template.defaultEnabledKPIs || []` before save

---

### 6. WorkTask Soft Delete

**Risk:** Hard delete breaks history and health calculations

**Check:**
```bash
# Check if WorkTask has deletedAt field
grep -r "deletedAt\|@DeleteDateColumn" zephix-backend/src/modules/work-management/entities/work-task.entity.ts
```

**Files to Verify:**
- [ ] `zephix-backend/src/modules/work-management/entities/work-task.entity.ts`
- [ ] DELETE endpoint behavior (hard vs soft delete)
- [ ] Health service filters deleted tasks

**Pass Criteria:**
- Deleting a task doesn't break plan views
- Health calculations ignore deleted tasks
- My Work doesn't show deleted tasks

**Fix if Failed (MVP Option):**
- Block DELETE endpoint for MVP testers
- Use archive/status change instead
- Or add `deletedAt` field and switch to soft delete

---

## B) Quality Gates Before MVP Testers

### 1. Smoke Test Proof Pack

**Required Network Logs:**

#### Task Operations
```
POST /api/work/tasks
Status: 201
Request Headers:
  Authorization: Bearer <token>
  x-workspace-id: <uuid>
Request Body: { projectId: <uuid>, title: "Test Task", ... }
Response Body: { id: <uuid>, title: "Test Task", status: "TODO" }

PATCH /api/work/tasks/<task-id>
Status: 200
Request Headers:
  Authorization: Bearer <token>
  x-workspace-id: <uuid>
Request Body: { status: "IN_PROGRESS" }
Response Body: { id: <uuid>, status: "IN_PROGRESS" }
```

#### My Work
```
GET /api/my-work
Status: 200
Request Headers:
  Authorization: Bearer <member-token>
Response Body: {
  version: 1,
  counts: { total: 1, done: 1, ... },
  items: [
    {
      id: <task-id>,
      title: "Test Task",
      status: "done",
      projectId: <uuid>,
      projectName: "Test Project",
      workspaceId: <uuid>,
      workspaceName: "Test Workspace"
    }
  ]
}
```

#### KPI Operations
```
GET /api/projects/<project-id>/kpis
Status: 200
Request Headers:
  Authorization: Bearer <token>
  x-workspace-id: <uuid>
Response Body: {
  availableKPIs: [
    { id: "kpi-1", name: "Completion Rate", ... }
  ],
  activeKpiIds: []
}

PATCH /api/projects/<project-id>/kpis
Status: 200
Request Headers:
  Authorization: Bearer <token>
  x-workspace-id: <uuid>
Request Body: { activeKpiIds: ["kpi-1", "kpi-2"] }
Response Body: {
  availableKPIs: [...],
  activeKpiIds: ["kpi-1", "kpi-2"]
}

# After refresh
GET /api/projects/<project-id>/kpis
Status: 200
Response Body: {
  activeKpiIds: ["kpi-1", "kpi-2"]  // Persisted
}
```

**Pass Criteria:**
- ✅ Zero 404 errors
- ✅ Zero 403 after workspace selection
- ✅ My Work shows assigned tasks
- ✅ KPI toggles persist after refresh

---

### 2. Minimal Automated Checks

#### Backend E2E Test

**File:** `zephix-backend/test/mvp-smoke-path.e2e-spec.ts`

```typescript
describe('MVP Smoke Path', () => {
  it('should complete full workflow: workspace → template → project → task → my work → kpis', async () => {
    // 1. Create workspace
    // 2. Apply template to create project
    // 3. Create task
    // 4. Assign task to member
    // 5. List my work (as member)
    // 6. Get project KPIs
    // 7. Patch project KPIs
    // 8. Verify persistence
  });
});
```

**Pass Criteria:**
- All steps complete without errors
- My Work returns assigned task
- KPI state persists

#### Frontend Playwright Smoke

**File:** `zephix-frontend/e2e/mvp-smoke.spec.ts`

```typescript
test('MVP smoke: login → workspace → project → KPI toggle', async ({ page }) => {
  // 1. Login
  // 2. Select workspace
  // 3. Create project from template
  // 4. Toggle KPI on
  // 5. Refresh page
  // 6. Verify KPI still on
});
```

**Pass Criteria:**
- Test completes in < 30 seconds
- KPI toggle persists after refresh

---

### 3. Security and Tenancy Checks

#### Workspace Access Enforcement

**Check All Dashboard Endpoints:**
```bash
# Verify all dashboard endpoints require x-workspace-id
grep -r "@Get\|@Post\|@Patch" zephix-backend/src/modules/dashboards/controllers/project-dashboard.controller.ts
```

**Pass Criteria:**
- Every endpoint validates `x-workspace-id` header
- Every endpoint calls `WorkspaceAccessService.canAccessWorkspace()`
- Missing header returns 403, not 500

#### Project-Workspace Validation

**Check:**
```bash
# Verify projectId belongs to workspaceId
grep -A 5 "projectId.*workspaceId" zephix-backend/src/modules/dashboards/services/project-dashboard.service.ts
```

**Pass Criteria:**
- Every project query filters by both `projectId` AND `workspaceId`
- No endpoint accepts `workspaceId` from request body for workspace-scoped actions
- Cross-workspace access returns 404, not 403 (don't leak existence)

---

## C) Platform Differentiation Checks

### 1. No Configuration Advantage

**Verify:**
- [ ] Admin creates org defaults (templates, KPI definitions)
- [ ] Workspace owners create projects, choose templates
- [ ] Members execute work, no extra setup
- [ ] KPI toggles are only project-level configuration

**Test:**
- Create project from template
- Verify default KPIs are already active (if template has defaultEnabledKPIs)
- Member can see and execute work immediately

---

### 2. Auto Status Without Manual Updates

**Verify Signals Used:**
- [ ] WorkTask status distribution
- [ ] Overdue tasks count
- [ ] Blocked tasks count
- [ ] BehindTargetDays from health engine
- [ ] Dependency risk signals

**Test:**
- Create tasks with various statuses
- Check dashboard summary endpoint
- Verify health code matches signal state

---

### 3. KPI Toggle → Dashboard Integration

**Verify:**
- [ ] Dashboard KPIs endpoint filters by `Project.activeKpiIds`
- [ ] Toggling KPI off removes it from dashboard
- [ ] Computed KPIs show values
- [ ] Manual KPIs show "needs update" placeholder

**Test:**
- Toggle KPI on → appears in dashboard
- Toggle KPI off → disappears from dashboard
- Refresh → state persists

---

## D) Pre-MVP Verification Script

Create and run this script before MVP testers:

```bash
#!/bin/bash
# verify-mvp-readiness.sh

echo "=== MVP Readiness Verification ==="

# 1. Check API client consistency
echo "1. Checking API client imports..."
CLIENT_COUNT=$(grep -r "import.*api.*from" zephix-frontend/src --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l | xargs)
echo "   Found $CLIENT_COUNT API import statements"

# 2. Check workspace header propagation
echo "2. Checking workspace header in interceptor..."
if grep -q "x-workspace-id" zephix-frontend/src/services/api.ts; then
  echo "   ✓ x-workspace-id header found in interceptor"
else
  echo "   ✗ x-workspace-id header missing"
fi

# 3. Check backend role enforcement
echo "3. Checking KPI endpoint role guards..."
if grep -q "RequireWorkspaceRole" zephix-backend/src/modules/projects/projects.controller.ts; then
  echo "   ✓ Role guard found on KPI endpoint"
else
  echo "   ✗ Role guard missing"
fi

# 4. Check migration exists
echo "4. Checking migration file..."
if [ -f "zephix-backend/src/migrations/1789000000000-AddActiveKpiIdsToProjects.ts" ]; then
  echo "   ✓ Migration file exists"
else
  echo "   ✗ Migration file missing"
fi

# 5. Check entity field
echo "5. Checking Project entity for activeKpiIds..."
if grep -q "activeKpiIds\|active_kpi_ids" zephix-backend/src/modules/projects/entities/project.entity.ts; then
  echo "   ✓ activeKpiIds field found"
else
  echo "   ✗ activeKpiIds field missing"
fi

echo "=== Verification Complete ==="
```

---

## E) Critical Fixes Before MVP

### Fix 1: Template Instantiation Sets activeKpiIds

**File:** `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts` (or instantiation service)

**Add:**
```typescript
// After creating project, before saving
if (template.defaultEnabledKPIs && template.defaultEnabledKPIs.length > 0) {
  project.activeKpiIds = template.defaultEnabledKPIs;
}
```

---

### Fix 2: Centralize Workspace ID Helper

**File:** `zephix-frontend/src/utils/workspace.ts` (NEW)

```typescript
import { useWorkspaceStore } from '@/state/workspace.store';

export function getActiveWorkspaceId(): string | null {
  return useWorkspaceStore.getState().activeWorkspaceId;
}

export function requireWorkspace(): string {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) {
    throw new Error('Workspace required. Please select a workspace first.');
  }
  return workspaceId;
}
```

**Update:** `zephix-frontend/src/services/api.ts` interceptor to use helper

---

### Fix 3: Add Workspace Guard Component

**File:** `zephix-frontend/src/components/WorkspaceGuard.tsx` (NEW)

```typescript
export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { activeWorkspaceId } = useWorkspaceStore();

  if (!activeWorkspaceId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          Please select a workspace to continue.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## F) Network Log Verification Template

When running smoke test, capture these exact requests:

### Must-Have Logs

1. **Task Creation**
   ```
   POST /api/work/tasks
   Headers: { Authorization, x-workspace-id }
   Status: 201
   ```

2. **My Work (as Member)**
   ```
   GET /api/my-work
   Headers: { Authorization }
   Status: 200
   Items: [assigned task]
   ```

3. **KPI Get**
   ```
   GET /api/projects/:id/kpis
   Headers: { Authorization, x-workspace-id }
   Status: 200
   Response: { availableKPIs: [...], activeKpiIds: [] }
   ```

4. **KPI Patch**
   ```
   PATCH /api/projects/:id/kpis
   Headers: { Authorization, x-workspace-id }
   Body: { activeKpiIds: ["kpi-1"] }
   Status: 200
   ```

5. **KPI Get (After Refresh)**
   ```
   GET /api/projects/:id/kpis
   Status: 200
   Response: { activeKpiIds: ["kpi-1"] }  // Persisted
   ```

---

## G) Failure Mapping

If smoke test fails, use this mapping:

| Failure | Symptom | File to Check | Fix |
|---------|---------|---------------|-----|
| 404 on tasks | `/api/tasks/*` in network | `taskService.ts`, `TaskList.tsx` | Update to `/work/tasks` |
| 403 WORKSPACE_REQUIRED | Missing header | `api.ts` interceptor | Add header logic |
| My Work empty | Task exists but not shown | `my-work.service.ts` | Query WorkTask, not WorkItem |
| KPIs not persisting | Resets after refresh | `project.entity.ts`, migration | Add field, run migration |
| Viewer can toggle | No 403 on PATCH | `projects.controller.ts` | Add role guard |

---

**Next:** Run smoke test, paste actual network logs, and I'll provide file-by-file fixes.
