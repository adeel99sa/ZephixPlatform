# Work Items Phase 2 - Complete Implementation

## Summary

All files have been updated to match the provided specifications. The implementation now supports:
- Cross-project dependencies within the same workspace
- All dependency types: FS, SS, FF, SF
- Workspace-wide cycle prevention
- Search API across workspace
- Enhanced frontend dependency picker

## Files Changed

### Backend (8 files)

1. **zephix-backend/src/modules/work-items/entities/work-item-dependency.entity.ts**
   - Updated to support FS, SS, FF, SF types
   - Column name: `dependency_type` (varchar(2))
   - Removed `organizationId` (workspace-scoped only)
   - Updated indexes to workspace-scoped
   - Updated unique constraint

2. **zephix-backend/src/modules/work-items/entities/work-item.entity.ts**
   - Added dependency relations (blockingDependencies, blockedByDependencies)

3. **zephix-backend/src/modules/work-items/dto/create-dependency.dto.ts**
   - Updated to accept all dependency types
   - Lag days range: -3650 to 3650

4. **zephix-backend/src/modules/work-items/dto/search-work-items.dto.ts** (NEW)
   - DTO for search endpoint with validation

5. **zephix-backend/src/modules/work-items/work-item.controller.ts**
   - Added `GET /api/work-items/search` endpoint
   - Uses `@Headers('x-workspace-id')` decorator

6. **zephix-backend/src/modules/work-items/work-item.service.ts**
   - Updated `addDependency()` - workspace-scoped, supports all types
   - Updated `listDependencies()` - returns enriched data with project names
   - Updated `deleteDependency()` - workspace-scoped
   - Updated `searchWorkItemsInWorkspace()` - uses raw query builder
   - Updated `assertNoCycleWorkspace()` - BFS cycle detection
   - Updated `assertSameWorkspace()` - validates workspace membership

7. **zephix-backend/src/modules/projects/projects.controller.ts**
   - Updated dependency routes to use `@Headers('x-workspace-id')`
   - Updated to match new service signatures

8. **zephix-backend/src/migrations/1792000000000-WorkItemDependencyPhase2.ts**
   - Handles renaming `type` to `dependency_type` if needed
   - Makes `project_id` nullable
   - Updates unique index to workspace-scoped
   - Adds workspace indexes

### Frontend (3 files)

1. **zephix-frontend/src/features/work-management/api.ts**
   - Added `searchWorkItems()` function
   - Updated `addWorkItemDependency()` to accept type and lagDays
   - Extended types: `DependencyRow`, `WorkItemRow`
   - Preserved `WorkItem` type for tree structure

2. **zephix-frontend/src/features/work-management/components/AddDependencyModal.tsx**
   - Complete rewrite with:
     - Search input with 300ms debounce
     - Results grouped by project name
     - Dependency type dropdown (FS, SS, FF, SF) with labels
     - Lag days input
     - Uses `sonner` for toast notifications
     - Default export

3. **zephix-frontend/src/features/work-management/components/WorkItemDetailsPanel.tsx**
   - Updated to use `DependencyRow` type
   - Updated to show dependency type and lag days
   - Updated to use new modal structure

## Build Commands

### Backend
```bash
cd zephix-backend
npm ci
npm run build
npm run migration:run
```

### Frontend
```bash
cd zephix-frontend
npm ci
npm run build
npm run lint:new
```

## CURL Test Commands

Replace placeholders:
- `BASE`: `http://localhost:3000`
- `TOKEN`: Valid JWT token
- `WORKSPACE_ID`: Valid workspace ID
- `PROJECT_ID_1`: Project 1 ID in workspace
- `PROJECT_ID_2`: Project 2 ID in workspace

### 1. Create Task A in Project 1
```bash
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_1}/work-items" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Task A in Project 1"}'
```
Save the `id` from response as `TASK_A_ID`

### 2. Create Task B in Project 2
```bash
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_2}/work-items" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Task B in Project 2"}'
```
Save the `id` from response as `TASK_B_ID`

### 3. Search for work items
```bash
curl -sS -X GET "${BASE}/api/work-items/search?q=Task&limit=50" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}"
```
Expected: Returns both Task A and Task B with their project names

### 4. Add cross-project dependency (A -> B with FS type)
```bash
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_2}/work-items/${TASK_B_ID}/dependencies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"predecessorId":"'${TASK_A_ID}'","type":"FS","lagDays":0}'
```
Expected: 200 OK with `{ "data": { "id": "..." } }`

### 5. List dependencies for Task B
```bash
curl -sS -X GET "${BASE}/api/projects/${PROJECT_ID_2}/work-items/${TASK_B_ID}/dependencies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}"
```
Expected: Returns dependency with enriched data showing Task A title and project name

### 6. Test cycle prevention (should fail)
```bash
# Try to create B -> A dependency (creates cycle)
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_1}/work-items/${TASK_A_ID}/dependencies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"predecessorId":"'${TASK_B_ID}'","type":"FS","lagDays":0}'
```
Expected: 400 Bad Request - "Dependency creates a cycle."

### 7. Test different dependency types
```bash
# SS (Start-to-Start) with lag days
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_2}/work-items/${TASK_B_ID}/dependencies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"predecessorId":"'${TASK_A_ID}'","type":"SS","lagDays":2}'
```

### 8. Delete dependency
```bash
curl -sS -X DELETE "${BASE}/api/projects/${PROJECT_ID_2}/work-items/${TASK_B_ID}/dependencies/${DEP_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}"
```

## Key Architectural Changes

1. **Dependency Entity**: Removed `organizationId` - dependencies are workspace-scoped only
2. **Column Naming**: Uses `dependency_type` instead of `type` to avoid conflicts
3. **Unique Constraint**: Changed from project-scoped to workspace-scoped
4. **Service Pattern**: Uses TenantAwareRepository but entity doesn't have organizationId (workspace-scoped)
5. **Cycle Detection**: Workspace-wide BFS traversal

## Acceptance Criteria

✅ Cross-project dependencies work (Task A in Project 1 -> Task B in Project 2)
✅ All dependency types supported (FS, SS, FF, SF)
✅ Workspace-wide cycle prevention
✅ Search endpoint returns items from multiple projects
✅ Frontend search with debounce and project grouping
✅ Dependency type and lagDays displayed in UI
✅ All responses unwrap correctly
✅ Build passes for backend and frontend

## Next Steps

The user mentioned they want to:
1. Create workspace (already exists)
2. Assign workspace to a member (needs implementation)

For workspace membership management, provide:
- Current workspace settings route
- Current sidebar navigation structure

Then I can create the exact prompt and file replacements for workspace membership management.
