# Database Cleanup Guide - Test Workspaces

**Date:** 2025-01-27  
**Status:** Ready for Manual Execution

## Step 1: Confirm Database Connection

**Your DATABASE_URL (masked):**
```
postgresql://postgres:****@ballast.proxy.rlwy.net:38318/railway
```

**Full path:** `zephix-backend/.env`

**Action:** Verify this is the same database your app uses before running any DELETE statements.

## Step 2: Identify Test Workspaces

Run these SQL queries in order:

### Query 1: List all workspaces (last 100)
```sql
SELECT
  w.id,
  w.name,
  w.organization_id,
  w.created_at,
  w.deleted_at
FROM workspaces w
ORDER BY w.created_at DESC
LIMIT 100;
```

### Query 2: Filter for test/demo workspaces
```sql
SELECT
  w.id,
  w.name,
  w.organization_id,
  w.created_at,
  w.deleted_at
FROM workspaces w
WHERE
  lower(w.name) LIKE '%demo%'
  OR lower(w.name) LIKE '%test%'
  OR lower(w.name) LIKE '%cursor%'
  OR lower(w.name) LIKE '%template proofs%'
ORDER BY w.created_at DESC;
```

**Action:** Copy the IDs from Query 2 results. These are the test workspaces to delete.

## Step 3: Check Membership Rows

Before deleting, check how many members each workspace has:

```sql
SELECT
  wm.workspace_id,
  w.name AS workspace_name,
  count(*) AS member_count
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
GROUP BY wm.workspace_id, w.name
ORDER BY member_count DESC;
```

**Action:** Note which workspaces have members. You'll need to delete memberships first if doing hard delete.

## Step 4: Delete Test Workspaces

### Option A: Soft Delete (Recommended)

**Why:** Preserves data, can be restored, safer for production.

**SQL:**
```sql
UPDATE workspaces
SET deleted_at = NOW()
WHERE id IN (
  'PUT-ID-1-HERE',
  'PUT-ID-2-HERE'
  -- Add more IDs from Step 2 results
);
```

**Replace:** `PUT-ID-1-HERE`, `PUT-ID-2-HERE` with actual workspace IDs from Step 2.

### Option B: Hard Delete (Only if Certain)

**WARNING:** Permanently removes data. Only use if you're certain about cascade behavior.

**Step 4a: Delete memberships first**
```sql
DELETE FROM workspace_members
WHERE workspace_id IN (
  'PUT-ID-1-HERE',
  'PUT-ID-2-HERE'
  -- Add more IDs from Step 2 results
);
```

**Step 4b: Delete workspaces**
```sql
DELETE FROM workspaces
WHERE id IN (
  'PUT-ID-1-HERE',
  'PUT-ID-2-HERE'
  -- Add more IDs from Step 2 results
);
```

## Step 5: Verify Deletion

After deletion, verify deleted workspaces are gone:

```sql
SELECT
  w.id,
  w.name,
  w.organization_id,
  w.created_at,
  w.deleted_at
FROM workspaces w
WHERE w.deleted_at IS NULL
ORDER BY w.created_at DESC;
```

**Expected:** Test workspaces should not appear in this list.

## Step 6: Verify Frontend Dropdown

1. **Clear localStorage:**
   - Open DevTools → Application → Local Storage
   - Delete key: `zephix.activeWorkspaceId`
   - Refresh page

2. **Login and check dropdown:**
   - Login to the app
   - Check sidebar workspace dropdown
   - Verify it shows only real workspaces (no test/demo ones)

3. **Verify API response:**
   - Open Network tab
   - Check `GET /api/workspaces` response
   - Verify it matches dropdown list
   - Verify deleted workspaces are NOT in the response

## Backend Fix Applied

**File:** `zephix-backend/src/modules/workspaces/workspaces.service.ts`

**Issue:** ADMIN users were seeing deleted workspaces because the query didn't filter `deletedAt IS NULL`.

**Fix:** Added `where: { deletedAt: null }` to the ADMIN query.

**Before:**
```typescript
const result = await this.repo
  .find({
    order: { createdAt: 'DESC' },
  })
```

**After:**
```typescript
const result = await this.repo
  .find({
    where: { deletedAt: null },
    order: { createdAt: 'DESC' },
  })
```

**Status:** ✅ Fixed - Both ADMIN and MEMBER/VIEWER queries now filter deleted workspaces.

## Header Behavior Verification

### Request 1: GET /api/workspaces
**Expected:** Must NOT include `x-workspace-id` header

**Verify in Network tab:**
- Open DevTools → Network
- Click on `GET /api/workspaces` request
- Check Request Headers
- Should NOT see `x-workspace-id`

### Request 2: GET /api/projects
**Expected:** Must include `x-workspace-id` header after workspace is selected

**Verify in Network tab:**
1. Select a workspace from dropdown
2. Navigate to `/projects` page
3. Open DevTools → Network
4. Click on `GET /api/projects` request
5. Check Request Headers
6. Should see: `x-workspace-id: <workspace-id>`

**If either is wrong:** Only file to touch is `zephix-frontend/src/services/api.ts`

## UX Lock Summary

✅ **Home URL:** `/home` stays the only home URL for all roles  
✅ **Workspace UX:** Dropdown selects context, no route changes on switch  
✅ **Empty States:** Pages show inline prompts when no workspace selected  
✅ **No Redirects:** Users stay on page, can select workspace from dropdown  

---

**Next Steps:**
1. Run Step 2 queries and paste results
2. Confirm if you want soft delete or hard delete
3. I'll provide exact DELETE statements with your workspace IDs
