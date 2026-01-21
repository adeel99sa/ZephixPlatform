# Database Cleanup - Execution Instructions

**Date:** 2025-01-27

## Prerequisites

1. **Database Connection:**
   - URL: `postgresql://postgres:****@ballast.proxy.rlwy.net:38318/railway`
   - Location: `zephix-backend/.env`
   - Verify this is the same database your app uses

2. **Database Client:**
   - Use `psql`, pgAdmin, DBeaver, or any PostgreSQL client
   - Connect using the DATABASE_URL from `.env`

## Step 1: Find Test Workspaces

**Run this query:**

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

**Action:** Copy and paste the results here (all rows with id, name, organization_id, created_at, deleted_at).

## Step 2: Soft Delete (After I Provide Statement)

Once you paste Step 1 results, I will provide an exact UPDATE statement like:

```sql
UPDATE workspaces
SET deleted_at = NOW()
WHERE id IN (
  'actual-id-1',
  'actual-id-2'
);
```

**Action:** Run the UPDATE statement I provide.

## Step 3: Verify Cleanup

**Run this query:**

```sql
SELECT
  w.id,
  w.name,
  w.organization_id,
  w.created_at,
  w.deleted_at
FROM workspaces w
WHERE w.deleted_at IS NULL
  AND (
    lower(w.name) LIKE '%demo%'
    OR lower(w.name) LIKE '%test%'
    OR lower(w.name) LIKE '%cursor%'
    OR lower(w.name) LIKE '%template proofs%'
  )
ORDER BY w.created_at DESC;
```

**Expected:** Zero rows (empty result set)

## Step 4: Clear Client State

**In Browser DevTools:**
1. Open Application → Local Storage
2. Delete key: `zephix.activeWorkspaceId`
3. Refresh page

## Step 5: Verify Frontend Behavior

**After cleanup and refresh:**

1. **Login to app**
2. **Check sidebar dropdown** - should show only real workspaces
3. **Network tab verification:**
   - `GET /api/workspaces`: Must NOT include `x-workspace-id` header ✅
   - `GET /api/projects`: Must include `x-workspace-id` header after selecting workspace ✅
4. **Verify dropdown matches API response:**
   - Dropdown list should equal `GET /api/workspaces` response ✅

---

**Next:** Run Step 1 query and paste the results here. I'll provide the exact UPDATE statement with your workspace IDs.
