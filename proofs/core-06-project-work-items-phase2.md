# Work Items Phase 2 - Cross-Project Dependencies

## Implementation Summary

Phase 2 extends Phase 1 with:
- Cross-project and cross-program dependencies within the same workspace
- Dependency types: FS, SS, FF, SF (not just FS)
- Workspace-wide cycle prevention (not just project-scoped)
- Search API for dependency picker across workspace
- Frontend dependency picker with search, type selection, and lagDays

## Backend Changes

### Entity Updates
- **WorkItemDependency**: 
  - `type` now supports 'FS' | 'SS' | 'FF' | 'SF'
  - `projectId` is now nullable (for cross-project dependencies)
  - Unique index changed from project-scoped to workspace-scoped

### New Endpoints
- `GET /api/work-items/search?q=...&limit=50` - Search work items across workspace

### Updated Endpoints
- `POST /api/projects/:projectId/work-items/:id/dependencies` - Now accepts `type` parameter
- `GET /api/projects/:projectId/work-items/:id/dependencies` - Returns enriched data with project names
- `DELETE /api/projects/:projectId/work-items/:id/dependencies/:depId` - Workspace-scoped

### Service Methods
- `searchWorkItemsInWorkspace()` - Search across workspace
- `assertSameWorkspace()` - Validate both items in same workspace
- `assertNoCycleWorkspace()` - Workspace-wide cycle detection
- `addDependency()` - Updated to support cross-project and all types
- `listDependencies()` - Returns enriched data with titles and project names

### Migration
- `1792000000000-WorkItemDependencyPhase2.ts` - Updates unique index and makes projectId nullable

## Frontend Changes

### API Functions
- `searchWorkItems()` - New function for workspace search
- `addWorkItemDependency()` - Updated to accept `type` parameter
- `Dependency` type - Extended with project name fields

### Components
- `AddDependencyModal` - Complete rewrite with:
  - Search input with 300ms debounce
  - Results grouped by project name
  - Dependency type dropdown (FS, SS, FF, SF)
  - Lag days input
  - Type descriptions
- `WorkItemDetailsPanel` - Updated to show dependency type and project names

## Testing Instructions

### Prerequisites
Replace placeholders:
- `BASE`: `http://localhost:3000` (or your backend URL)
- `TOKEN`: Valid JWT token
- `WORKSPACE_ID`: Valid workspace ID
- `PROJECT_ID_1`: Project 1 ID in workspace
- `PROJECT_ID_2`: Project 2 ID in workspace

### CURL Tests

1. **Create Task A in Project 1**
```bash
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_1}/work-items" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Task A in Project 1"}'
```
Save the `id` as `TASK_A_ID`

2. **Create Task B in Project 2**
```bash
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_2}/work-items" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Task B in Project 2"}'
```
Save the `id` as `TASK_B_ID`

3. **Search for work items**
```bash
curl -sS -X GET "${BASE}/api/work-items/search?q=Task&limit=50" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}"
```
Expected: Returns both Task A and Task B with their project names

4. **Add cross-project dependency (A -> B with FS type)**
```bash
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_2}/work-items/${TASK_B_ID}/dependencies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"predecessorId":"'${TASK_A_ID}'","type":"FS","lagDays":0}'
```
Expected: 200 OK with dependency ID

5. **List dependencies for Task B**
```bash
curl -sS -X GET "${BASE}/api/projects/${PROJECT_ID_2}/work-items/${TASK_B_ID}/dependencies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}"
```
Expected: Returns dependency with enriched data showing Task A and project names

6. **Test cycle prevention (should fail)**
```bash
# Try to create B -> A dependency (creates cycle)
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_1}/work-items/${TASK_A_ID}/dependencies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"predecessorId":"'${TASK_B_ID}'","type":"FS","lagDays":0}'
```
Expected: 400 Bad Request - "Dependency creates a cycle."

7. **Test different dependency types**
```bash
# SS (Start-to-Start)
curl -sS -X POST "${BASE}/api/projects/${PROJECT_ID_2}/work-items/${TASK_B_ID}/dependencies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"predecessorId":"'${TASK_A_ID}'","type":"SS","lagDays":2}'
```

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

## Files Changed

### Backend
1. `zephix-backend/src/modules/work-items/entities/work-item-dependency.entity.ts`
   - Updated type to support FS, SS, FF, SF
   - Made projectId nullable
   - Updated unique index to workspace-scoped

2. `zephix-backend/src/modules/work-items/dto/create-dependency.dto.ts`
   - Updated type validation to accept all four types

3. `zephix-backend/src/modules/work-items/dto/search-work-items.dto.ts` (NEW)
   - DTO for search endpoint

4. `zephix-backend/src/modules/work-items/work-item.controller.ts`
   - Added `GET /search` endpoint

5. `zephix-backend/src/modules/work-items/work-item.service.ts`
   - Added `searchWorkItemsInWorkspace()`
   - Added `assertSameWorkspace()`
   - Updated `assertNoCycleWorkspace()` (workspace-wide)
   - Updated `addDependency()` to support cross-project and all types
   - Updated `listDependencies()` to return enriched data
   - Updated `deleteDependency()` to be workspace-scoped

6. `zephix-backend/src/modules/work-items/work-item.module.ts`
   - Added Project repository provider

7. `zephix-backend/src/modules/projects/projects.controller.ts`
   - Updated dependency routes to use workspace-scoped methods

8. `zephix-backend/src/migrations/1792000000000-WorkItemDependencyPhase2.ts` (NEW)
   - Migration for Phase 2 changes

### Frontend
1. `zephix-frontend/src/features/work-management/api.ts`
   - Added `searchWorkItems()`
   - Updated `addWorkItemDependency()` to accept type
   - Extended `Dependency` type

2. `zephix-frontend/src/features/work-management/components/AddDependencyModal.tsx`
   - Complete rewrite with search, type selection, and lagDays

3. `zephix-frontend/src/features/work-management/components/WorkItemDetailsPanel.tsx`
   - Updated to show dependency type and project names

## Acceptance Criteria

✅ Cross-project dependencies work (Task A in Project 1 -> Task B in Project 2)
✅ All dependency types supported (FS, SS, FF, SF)
✅ Workspace-wide cycle prevention
✅ Search endpoint returns items from multiple projects
✅ Frontend search with debounce and project grouping
✅ Dependency type and lagDays displayed in UI
✅ All responses unwrap correctly
✅ Build passes for backend and frontend

## Next Steps (Future Phases)

- Critical path calculation
- Blocked count per item
- Auto-rescheduling based on dependencies
- Resource leveling
- Gantt chart visualization
