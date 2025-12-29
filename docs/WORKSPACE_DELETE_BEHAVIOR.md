# Workspace Delete Behavior

## Current Status (Phase 3)

**Workspace deletion is soft-delete only and admin-restricted.**

### Implementation

- **Endpoint**: `DELETE /api/workspaces/:id`
- **Guard**: `@RequireWorkspacePermission('delete_workspace')`
- **Service**: `WorkspacesService.softDelete()`
- **Behavior**: Sets `deleted_at` timestamp, does not cascade delete

### What Gets Soft-Deleted

- Workspace entity (marked with `deleted_at`)
- Workspace members (CASCADE on workspace delete via foreign key)

### What Does NOT Get Deleted

- Projects in the workspace (preserved, orphaned)
- Boards in the workspace (preserved, orphaned)
- Documents and forms (preserved, orphaned)
- Resource allocations (preserved, may reference deleted workspace)

### Business Rules

1. **Only workspace owners** (or org admins/owners) can delete workspaces
2. **Last owner protection**: Cannot remove last workspace owner before deletion
3. **Organization scoping**: Workspace must belong to user's organization

## Future Phases

### Phase X: Full Cascading Delete

**TODO**: When implementing full workspace deletion:

1. **Cascade options**:
   - Option A: Hard delete all projects, boards, documents, forms
   - Option B: Orphan resources (set workspace_id to NULL where allowed)
   - Option C: Archive workspace and all contents (soft delete everything)

2. **User confirmation**:
   - Require explicit confirmation with list of affected resources
   - Show count of projects, boards, documents that will be deleted

3. **Audit trail**:
   - Log workspace deletion with actor, timestamp, affected resource counts
   - Store in audit/activity log

4. **Recovery**:
   - Consider recovery window (e.g., 30 days) before permanent deletion
   - Admin restore capability

## Related Files

- `zephix-backend/src/modules/workspaces/workspaces.service.ts` - `softDelete()` method
- `zephix-backend/src/modules/workspaces/workspaces.controller.ts` - `DELETE /workspaces/:id` endpoint
- `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts` - Soft delete column definition

















