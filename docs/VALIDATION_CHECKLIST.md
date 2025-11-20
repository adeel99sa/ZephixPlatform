# Validation Checklist for Workspace-Project FK Link

## SQL Validation (Run in psql)

### 1. Check Column Exists
```sql
\d projects
-- Expected: workspace_id uuid
```

### 2. Check FK Constraint
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'projects'::regclass
  AND conname LIKE '%workspace%';
-- Expected: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT
```

### 3. Check Indexes
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'projects';
-- Expected: idx_projects_workspace_id, idx_projects_org_ws
```

### 4. Verify No Nulls
```sql
SELECT COUNT(*) FROM projects WHERE workspace_id IS NULL;
-- Expected: 0 (after migration runs)
```

## API Behavior Tests

### 1. List without workspaceId (should fail gracefully or return empty)
```bash
curl -i -H "Authorization: Bearer $TOKEN" "$API/projects"
# Response should handle missing workspaceId gracefully
```

### 2. List with workspaceId (should succeed)
```bash
curl -s -H "Authorization: Bearer $TOKEN" "$API/projects?workspaceId=$WID" | jq
# Expected: Array of projects with workspace_id field
```

### 3. Create without workspaceId (should reject)
```bash
curl -i -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}' \
  "$API/projects"
# Expected: 400 Bad Request - workspaceId is required
```

### 4. Create with workspaceId (should succeed)
```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Alpha\",\"workspaceId\":\"$WID\"}" \
  "$API/projects" | jq
# Expected: 201 Created with project containing workspaceId
```

## Code Hardening Applied

✅ **Service guard**: Service filters by `organizationId` AND `workspaceId` when provided
✅ **Controller validation**: Added `BadRequestException` if workspaceId is missing in create
✅ **DTO validation**: Added `@IsUUID()` validation for workspaceId field
✅ **Deletion semantics**: Uses `ON DELETE RESTRICT` to prevent orphaned projects
✅ **Backfill logic**: Migration backfills existing projects with first workspace in org
✅ **Indexes**: Created `idx_projects_workspace_id` and `(organization_id, workspace_id)` composite
✅ **DTO mapping**: Response DTO already maps `workspace_id` → `workspaceId`

## Migration Rollback

If issues occur:
```sql
ALTER TABLE projects DROP CONSTRAINT fk_projects_workspace;
ALTER TABLE projects ALTER COLUMN workspace_id DROP NOT NULL;
-- Keep column for easy re-apply
```

## Next Steps

1. Run migration: `npm run migration:run`
2. Execute SQL validation queries
3. Test API endpoints
4. Update E2E tests to include workspaceId in requests
5. Monitor logs for any FK constraint violations

