# Migration Runbook - Projects.workspace_id

## Purpose
Ensure `projects.workspace_id` FK is properly applied and validated after deployment.

## Pre-requisites
- Database access to production/staging
- Valid auth token for API testing
- Ability to rollback if issues occur

## Execution Steps

### 1) Run Migration
```bash
cd zephix-backend
npm run migration:run
```

Expected output:
```
Migration AddWorkspaceIdToProjects1762000000000 has been executed successfully.
```

### 2) Verify Database Shape
```sql
-- Connect to database
psql $DATABASE_URL

-- Check column exists
\d projects
-- Expected: workspace_id uuid

-- Verify no nulls (after backfill)
SELECT COUNT(*) FROM projects WHERE workspace_id IS NULL;
-- Expected: 0

-- Verify FK constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'projects'::regclass
  AND conname LIKE '%workspace%';
-- Expected: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'projects'
  AND indexname LIKE '%workspace%';
-- Expected: idx_projects_workspace_id, idx_projects_org_ws
```

### 3) Sanity API Tests
```bash
# Set up environment
export API=http://localhost:3000/api
export TOKEN="your-jwt-token"
export WID="workspace-uuid"

# Test 1: List without workspaceId (should fail or return empty)
curl -i -H "Authorization: Bearer $TOKEN" "$API/projects"

# Test 2: List with workspaceId (should succeed)
curl -s -H "Authorization: Bearer $TOKEN" "$API/projects?workspaceId=$WID" | jq

# Test 3: Create without workspaceId (should reject)
curl -i -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}' \
  "$API/projects"
# Expected: 400 Bad Request

# Test 4: Create with workspaceId (should succeed)
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Alpha\",\"workspaceId\":\"$WID\"}" \
  "$API/projects" | jq
# Expected: 201 Created with project containing workspaceId
```

### 4) Observability Check (10m after release)
Monitor the following for 10 minutes:

- **Dashboard**: Rate of 400s at `/projects` without workspaceId should be ~0
- **Logs**: Ensure `orgId` and `workspaceId` present on all project-related logs
- **Metrics**: No spikes in FK constraint violations

```bash
# Check for constraint violations in logs
grep -i "foreign key" /var/log/app.log | tail -20
# Should show no new violations
```

### 5) Rollback Plan (if issues occur)

If anything goes sideways:

```sql
-- Connect to database
psql $DATABASE_URL

-- Drop FK constraint (keeps column)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_workspace;

-- Make column nullable again
ALTER TABLE projects ALTER COLUMN workspace_id DROP NOT NULL;

-- Keep column in place for easy re-apply later
```

Then:
1. Investigate root cause
2. Fix migration if needed
3. Re-run migration after fixes

## Success Criteria
- ✅ Migration completes without errors
- ✅ Column exists and is indexed
- ✅ FK constraint is in place
- ✅ API requires workspaceId on create
- ✅ No null workspace_id values in DB
- ✅ Logs show orgId + workspaceId context
- ✅ No constraint violation errors

## Post-Migration Tasks
1. Update monitoring dashboards to track workspaceId usage
2. Add alert for FK constraint violations
3. Document workspace-scoping in API docs

