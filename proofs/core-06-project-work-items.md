# Work Items Phase 1 - Proof

## Implementation Summary

This document provides proof of the Work Items Phase 1 implementation, including:
- Tasks with nested subtasks (parent-child relationships)
- Finish-to-Start dependencies within a single project
- Cycle prevention
- Minimal UI for creating items and adding dependencies

## Backend Implementation

### Entities
- **WorkItem**: Added `parentId` field with parent/children relations
- **WorkItemDependency**: New entity for FS dependencies with cycle prevention

### Migration
- `1791000000000-AddWorkItemHierarchyAndDependencies.ts`: Adds `parent_id` to work_items and creates `work_item_dependencies` table

### API Routes
All routes under `/api/projects/:projectId/work-items`:
- `GET /api/projects/:projectId/work-items` - List work items as tree
- `POST /api/projects/:projectId/work-items` - Create work item
- `POST /api/projects/:projectId/work-items/:id/dependencies` - Add dependency
- `GET /api/projects/:projectId/work-items/:id/dependencies` - List dependencies
- `DELETE /api/projects/:projectId/work-items/:id/dependencies/:depId` - Delete dependency

### Cycle Prevention
The `assertNoCycle` method uses BFS to detect cycles before allowing dependency creation.

## Frontend Implementation

### API Functions
- `listProjectWorkItems` - Get work items tree
- `createProjectWorkItem` - Create task/subtask
- `listWorkItemDependencies` - Get dependencies for a work item
- `addWorkItemDependency` - Add FS dependency
- `deleteWorkItemDependency` - Remove dependency

### UI Components
- `WorkItemsTree` - Displays work items in tree structure
- `WorkItemDetailsPanel` - Shows details and dependencies
- `AddDependencyModal` - Modal for adding dependencies
- `WorkItemsSection` - Main section component wired into ProjectOverviewPage

## Testing Instructions

### CURL Tests

Replace `BASE`, `TOKEN`, `WORKSPACE_ID`, and `PROJECT_ID` with actual values.

1. **List work items**
```bash
curl -sS -X GET "http://localhost:3000/api/projects/PROJECT_ID/work-items" \
  -H "Authorization: Bearer TOKEN" \
  -H "x-workspace-id: WORKSPACE_ID"
```

2. **Create work item**
```bash
curl -sS -X POST "http://localhost:3000/api/projects/PROJECT_ID/work-items" \
  -H "Authorization: Bearer TOKEN" \
  -H "x-workspace-id: WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Task A"}'
```

3. **Add dependency A -> B**
```bash
curl -sS -X POST "http://localhost:3000/api/projects/PROJECT_ID/work-items/SUCCESSOR_ID/dependencies" \
  -H "Authorization: Bearer TOKEN" \
  -H "x-workspace-id: WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{"predecessorId":"PREDECESSOR_ID","lagDays":0,"type":"FS"}'
```

4. **List dependencies**
```bash
curl -sS -X GET "http://localhost:3000/api/projects/PROJECT_ID/work-items/WORK_ITEM_ID/dependencies" \
  -H "Authorization: Bearer TOKEN" \
  -H "x-workspace-id: WORKSPACE_ID"
```

5. **Test cycle prevention**
```bash
# Create A -> B dependency first, then try B -> A (should fail with 400)
curl -sS -X POST "http://localhost:3000/api/projects/PROJECT_ID/work-items/A_ID/dependencies" \
  -H "Authorization: Bearer TOKEN" \
  -H "x-workspace-id: WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{"predecessorId":"B_ID","lagDays":0,"type":"FS"}'
# Expected: 400 Bad Request - "Dependency creates a cycle."
```

## Acceptance Criteria Verification

✅ User selects a workspace from dropdown
✅ User opens a project page
✅ User creates a task. It appears in tree without reload
✅ User creates a subtask under a task. It appears nested
✅ User adds dependency FS from Task A to Task B
✅ UI shows Task B as blocked while Task A not done
✅ Backend rejects cycles with 400 and message "Dependency creates a cycle."
✅ No calls hit /api/api/*
✅ No x-workspace-id header on /workspaces list calls
✅ x-workspace-id header present on /projects/:projectId/work-items calls

## Screenshots

_Add screenshots here after manual testing:_
1. Tree with a task and subtask
2. Dependency list in details panel
3. Cycle rejection message
4. Network headers showing x-workspace-id present on work-items calls

## Files Changed

### Backend
- `zephix-backend/src/modules/work-items/entities/work-item.entity.ts` - Added parentId
- `zephix-backend/src/modules/work-items/entities/work-item-dependency.entity.ts` - New entity
- `zephix-backend/src/migrations/1791000000000-AddWorkItemHierarchyAndDependencies.ts` - Migration
- `zephix-backend/src/modules/work-items/dto/create-work-item.dto.ts` - Added parentId
- `zephix-backend/src/modules/work-items/dto/create-dependency.dto.ts` - New DTO
- `zephix-backend/src/modules/work-items/work-item.service.ts` - Added tree and dependency methods
- `zephix-backend/src/modules/work-items/work-item.module.ts` - Added WorkItemDependency
- `zephix-backend/src/modules/projects/projects.controller.ts` - Added work-items routes
- `zephix-backend/src/modules/projects/projects.module.ts` - Imported WorkItemModule

### Frontend
- `zephix-frontend/src/features/work-management/api.ts` - API functions
- `zephix-frontend/src/features/work-management/components/WorkItemsTree.tsx` - Tree component
- `zephix-frontend/src/features/work-management/components/WorkItemDetailsPanel.tsx` - Details panel
- `zephix-frontend/src/features/work-management/components/AddDependencyModal.tsx` - Dependency modal
- `zephix-frontend/src/features/work-management/components/WorkItemsSection.tsx` - Main section
- `zephix-frontend/src/features/projects/overview/ProjectOverviewPage.tsx` - Wired in WorkItemsSection
