# Phase 7.2: My Work

## Overview

My Work provides Admin and Member users with a single view of all their assigned work items across all accessible workspaces. Guest (VIEWER) users cannot access this feature.

## Backend API

### Endpoint

**Primary:** `GET /api/my-work`

**Backward Compatible Alias:** `GET /api/work-items/my-work` (TODO: Remove in Phase 7.4 cleanup)

### Authentication

- Requires `JwtAuthGuard`
- Guest (VIEWER) users receive `403 Forbidden`

### Response Format

```json
{
  "version": 1,
  "counts": {
    "total": 10,
    "overdue": 2,
    "dueSoon7Days": 3,
    "inProgress": 4,
    "todo": 3,
    "done": 3
  },
  "items": [
    {
      "id": "uuid",
      "title": "Task title",
      "status": "todo" | "in_progress" | "done",
      "dueDate": "2024-01-15T00:00:00Z" | null,
      "updatedAt": "2024-01-10T12:00:00Z",
      "projectId": "uuid",
      "projectName": "Project Name",
      "workspaceId": "uuid",
      "workspaceName": "Workspace Name"
    }
  ]
}
```

### Scoping Rules

1. Uses `WorkspaceAccessService.getAccessibleWorkspaceIds()` to determine accessible workspaces
2. Queries `WorkItem` with:
   - `organizationId` = user's organization
   - `workspaceId IN accessibleWorkspaceIds` (or all if Admin)
   - `assigneeId` = user's ID
   - `deletedAt IS NULL`
3. Joins `Project` and `Workspace` for names
4. Returns empty payload if no accessible workspaces

### Sorting

1. Overdue items first (dueDate < now AND status != DONE)
2. Then by dueDate ascending (nulls last)
3. Finally by updatedAt descending

### Performance

- Default limit: 200 items
- Index recommended: `(organization_id, assignee_id, workspace_id, due_date)`

## Frontend

### Route

- Path: `/my-work`
- Protected by: `ProtectedRoute` and `PaidRoute`
- Navigation: Added to Sidebar for paid users only

### Features

- **Filter Chips**: All, Overdue, Due soon, In progress, Todo, Done
- **Counts Summary**: Total, Overdue, Due Soon, In Progress, Todo, Done
- **Task Table**: Title, Status, Due Date, Project, Workspace
- **Row Click**: Navigates to project overview with `?taskId=<id>` query param
- **Empty States**: Clear messaging for no tasks or errors

### Navigation Integration

- Sidebar link visible only for Admin and Member
- Row click navigates to `/projects/:projectId?taskId=<id>`
- Project overview scrolls to TaskListSection and highlights the task

## Role Rules

| Role | Access | Notes |
|------|--------|-------|
| ADMIN | ✅ Full access | Sees tasks from all workspaces in org |
| MEMBER | ✅ Full access | Sees tasks only from accessible workspaces |
| VIEWER (Guest) | ❌ 403 Forbidden | Cannot access endpoint or page |

## Manual Testing Checklist

### Admin User

1. ✅ Login as Admin
2. ✅ Navigate to `/my-work`
3. ✅ See all assigned tasks across all workspaces
4. ✅ Filter by status (All, Overdue, Due soon, etc.)
5. ✅ Click a task row → navigates to project overview
6. ✅ Verify task is highlighted in TaskListSection

### Member User

1. ✅ Login as Member with access to Workspace A only
2. ✅ Navigate to `/my-work`
3. ✅ See only tasks from Workspace A
4. ✅ Verify no tasks from Workspace B appear
5. ✅ Filter by status
6. ✅ Click a task row → navigates to project overview

### Guest User

1. ✅ Login as Guest (VIEWER)
2. ✅ Navigate to `/my-work` → redirected to `/home`
3. ✅ Direct API call to `/my-work` → 403 Forbidden
4. ✅ Verify "My Work" link not visible in Sidebar

## Commands to Run Tests

```bash
# Backend integration tests
cd zephix-backend
npm test -- my-work.integration.spec.ts

# Frontend build
cd zephix-frontend
npm run build
```

## Files Changed

### Backend

- `zephix-backend/src/modules/work-items/dto/my-work-response.dto.ts` (new)
- `zephix-backend/src/modules/work-items/services/my-work.service.ts` (new)
- `zephix-backend/src/modules/work-items/my-work.controller.ts` (new - primary endpoint)
- `zephix-backend/src/modules/work-items/work-item.controller.ts` (updated - backward compatible alias)
- `zephix-backend/src/modules/work-items/work-item.module.ts` (updated)
- `zephix-backend/src/modules/work-items/my-work.integration.spec.ts` (new)

### Frontend

- `zephix-frontend/src/pages/my-work/MyWorkPage.tsx` (new)
- `zephix-frontend/src/App.tsx` (updated - added route)
- `zephix-frontend/src/components/shell/Sidebar.tsx` (updated - added nav link)
- `zephix-frontend/src/features/projects/overview/ProjectOverviewPage.tsx` (updated - taskId query param handling)
- `zephix-frontend/src/features/projects/components/TaskListSection.tsx` (updated - task highlighting)

## Known Limitations

- No pagination (default limit 200)
- No search/filter by project or workspace
- No bulk actions
- Task highlighting uses CSS classes (may need refinement)
