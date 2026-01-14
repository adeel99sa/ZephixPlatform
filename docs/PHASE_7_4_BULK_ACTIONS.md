# Phase 7.4: Bulk Actions for Work Items

## Overview

Bulk actions allow Admin and Member users to update or delete multiple work items at once within a project. This significantly speeds up task management for projects with many tasks.

## Endpoints

### POST /api/work-items/bulk/update

Bulk update work items (status, assignee, due date).

**Request Body:**
```json
{
  "workspaceId": "uuid",
  "projectId": "uuid",
  "ids": ["uuid1", "uuid2", ...],  // Max 200 items
  "patch": {
    "status": "todo" | "in_progress" | "done",  // Optional
    "assigneeId": "uuid" | null,  // Optional, null to unassign
    "dueDate": "2024-01-15" | null  // Optional, ISO date string, null to clear
  }
}
```

**Response:**
```json
{
  "updatedCount": 2,
  "skippedCount": 1,
  "errors": [
    {
      "id": "uuid",
      "reason": "Invalid status transition from done to todo"
    }
  ]
}
```

**Rules:**
- Maximum 200 items per operation
- All IDs must belong to the specified workspaceId and projectId
- Status transition validation applies per item
- Permission checks apply per item (Member can only edit assigned tasks or tasks in their workspace)
- WorkItemActivity recorded for each successfully updated item with `bulkUpdate: true` in payload

### POST /api/work-items/bulk/delete

Bulk delete work items (Admin only).

**Request Body:**
```json
{
  "workspaceId": "uuid",
  "projectId": "uuid",
  "ids": ["uuid1", "uuid2", ...]  // Max 200 items
}
```

**Response:**
```json
{
  "updatedCount": 2,
  "skippedCount": 0,
  "errors": []
}
```

**Rules:**
- Admin only (403 Forbidden for Member and Guest)
- Maximum 200 items per operation
- Soft delete if supported (sets `deletedAt`), otherwise sets status to DONE
- WorkItemActivity recorded with `bulkDelete: true` in payload

## Role Rules

### Admin
- Can bulk update/delete any work items in accessible workspaces
- Can operate across multiple workspaces if they have access

### Member
- Can bulk update work items they are assigned to OR work items in workspaces where they are workspace_member or workspace_owner
- Cannot bulk delete (403 Forbidden)
- Cannot update work items in workspaces they don't have access to (404 Not Found)

### Guest (VIEWER)
- Cannot perform any bulk actions (403 Forbidden)
- Read-only access

## Scoping and Security

### Workspace Scoping
- All operations require `workspaceId` and `projectId` in the request body
- Backend validates that all work item IDs belong to the specified workspace and project
- Returns 404 if any ID is not found in the specified scope (prevents existence leaks)
- Returns 404 if user doesn't have access to the workspace (not 403, to avoid revealing workspace existence)

### Organization Scoping
- All queries automatically filter by `organizationId` from the authenticated user's context
- No cross-organization data leakage possible

### Cross-Project Protection
- If an ID from a different project is included, the operation fails with 404
- Implementation choice: **Atomic** - if any ID is invalid, the entire operation fails with 404
- This prevents partial updates that could be confusing

## Status Transition Validation

Status transitions are validated per item:
- `TODO` → `IN_PROGRESS` or `DONE` ✅
- `IN_PROGRESS` → `TODO` or `DONE` ✅
- `DONE` → `IN_PROGRESS` ✅ (reopen)
- `DONE` → `TODO` ❌ (invalid)

If a status transition is invalid for an item:
- That item is skipped (not updated)
- Added to `errors` array with reason
- Other items in the batch are still processed

## Activity Logging

Each successfully updated or deleted item gets a WorkItemActivity record:
- **Type:** `UPDATED`
- **Payload:**
  - `bulkUpdate: true` for bulk updates
  - `bulkDelete: true` for bulk deletes
  - `changedFields`: Object with before/after values for changed fields

## Known Limitations

1. **Maximum 200 items per operation** - Enforced to prevent performance issues
2. **Atomic validation** - If any ID is invalid, entire operation fails (no partial updates)
3. **No bulk create** - Not implemented in Phase 7.4
4. **No bulk comment** - Not implemented in Phase 7.4
5. **Status transitions** - Some transitions are not allowed (e.g., DONE → TODO)

## Frontend UI

### TaskListSection Component

**Features:**
- Row checkboxes for individual selection
- Header checkbox for "Select all"
- Bulk action bar appears when 1+ tasks selected
- Actions:
  - Change Status (dropdown)
  - Assign To (member dropdown)
  - Set Due Date (date picker)
  - Clear Due Date
  - Unassign
  - Delete (Admin only, red button)

**User Experience:**
- Selected tasks highlighted with blue background
- Result toast shows updated/skipped counts
- Selection persists only for skipped items after action
- List refreshes automatically after successful bulk action

## Manual Testing Steps

### Admin Bulk Update

1. Login as Admin
2. Navigate to a project with multiple tasks
3. Select 3-5 tasks using checkboxes
4. Click "Change Status" → Select "In Progress"
5. Click "Update"
6. Verify:
   - Toast shows "Updated X tasks"
   - Selected tasks now show "In Progress" status
   - Activity log shows bulk update entries

### Member Bulk Update (Own Tasks)

1. Login as Member
2. Navigate to a project where you have assigned tasks
3. Select 2-3 of your assigned tasks
4. Click "Set Due Date" → Select a date
5. Click "Update"
6. Verify:
   - Toast shows success
   - Due dates updated
   - Cannot see "Delete" button (Admin only)

### Member Bulk Delete Attempt

1. Login as Member
2. Select tasks
3. Verify "Delete" button is not visible
4. If visible (bug), clicking it should return 403

### Guest Bulk Action Attempt

1. Login as Guest
2. Navigate to a project
3. Verify:
   - No checkboxes visible
   - No bulk action bar
   - All tasks are read-only

### Cross-Workspace Protection

1. Login as Member with access to Workspace A only
2. Try to bulk update tasks in Workspace B (if you know the IDs)
3. Verify: 404 Not Found (not 403, to avoid revealing workspace existence)

### Status Transition Validation

1. Login as Admin
2. Manually set a task to "Done"
3. Select that task
4. Try to bulk update status to "Todo"
5. Verify:
   - Toast shows "X tasks skipped"
   - Task remains "Done"
   - Error message indicates invalid transition

### Maximum Items Limit

1. Login as Admin
2. Create a project with 201+ tasks
3. Try to select all and bulk update
4. Verify: Validation error prevents operation (max 200)

## Commands

### Run Integration Tests

```bash
cd zephix-backend
npm test -- work-items-bulk.integration.spec.ts
```

### Test Coverage

The integration tests cover:
1. ✅ Guest bulk update blocked (403)
2. ✅ Member bulk update allowed in own workspace
3. ✅ Member cannot cross workspace (404)
4. ✅ Admin can operate across workspaces
5. ✅ Max 200 items validation
6. ✅ Cross-project ID mixing blocked
7. ✅ Status transition validation per item
8. ✅ Member bulk delete forbidden (403)
9. ✅ Admin bulk delete allowed and scoped
10. ✅ Non-member gets 404

## Implementation Notes

### Atomic vs Partial Updates

**Current Implementation: Atomic**
- If any ID is invalid (not in workspace/project), entire operation fails with 404
- This prevents confusing partial updates
- All-or-nothing approach for ID validation

**Alternative (Not Implemented): Partial**
- Update valid IDs, skip invalid ones
- Return `updatedCount` and `skippedCount` with errors array
- More complex but more flexible

### Soft Delete vs Status DONE

**Current Implementation:**
- Checks if `deletedAt` field exists on WorkItem entity
- If yes: Sets `deletedAt = new Date()`
- If no: Sets `status = DONE` as fallback

This ensures backward compatibility if soft delete is not yet implemented in the database schema.
