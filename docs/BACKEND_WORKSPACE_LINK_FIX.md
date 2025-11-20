# Backend: Workspace-Project FK Link

## Summary

Added `workspace_id` foreign key to projects table to properly scope projects to workspaces.

## Changes Made

### 1. Entity Update
**File**: `zephix-backend/src/modules/projects/entities/project.entity.ts`
- Added `workspaceId` column field
- Added `ManyToOne` relation to `Workspace` entity
- Import added for `Workspace` entity

### 2. Migration Created
**File**: `zephix-backend/src/migrations/1762000000000-AddWorkspaceIdToProjects.ts`
- Adds `workspace_id` column (nullable initially)
- Backfills existing projects with first workspace in org
- Adds indexes: `idx_projects_workspace_id`, `idx_projects_org_ws`
- Adds foreign key constraint with `ON DELETE RESTRICT`

### 3. Controller Update
**File**: `zephix-backend/src/modules/projects/projects.controller.ts`
- Added `workspaceId` query parameter to `findAll` endpoint
- Passes workspaceId to service layer for filtering

### 4. Service Update
**File**: `zephix-backend/src/modules/projects/services/projects.service.ts`
- `findAllProjects` now accepts `workspaceId` in options
- Adds workspaceId filter to where clause when provided

### 5. DTO Already Exists
**File**: `zephix-backend/src/modules/projects/dto/project.response.dto.ts`
- Already created with `workspaceId` mapping
- Uses `@Expose({ name: 'workspace_id' })` and `@Transform`

## Migration Strategy

The migration safely handles existing data by:
1. Adding column as nullable
2. Backfilling existing projects with first workspace in their org
3. Keeping column nullable to avoid breaking existing code
4. Future enhancement: Make NOT NULL after all services updated

## To Apply

Run migration:
```bash
cd zephix-backend
npm run migration:run
```

## Status

✅ Entity updated
✅ Migration created
✅ Controller accepts workspaceId filter
✅ Service filters by workspaceId
✅ DTO already maps snake_case → camelCase

Frontend was already built to work with `workspaceId` parameter, so no frontend changes needed.

