-- ============================================
-- DATABASE CLEANUP: Test Workspaces
-- ============================================
-- 
-- STEP 1: Confirm Database Connection
-- 
-- Your DATABASE_URL (masked):
-- postgresql://postgres:****@ballast.proxy.rlwy.net:38318/railway
--
-- Verify this is the same database your app uses before running any DELETE statements.
--
-- ============================================
-- STEP 2: Identify Test Workspaces
-- ============================================

-- First, get all workspaces ordered by creation date
SELECT
  w.id,
  w.name,
  w.organization_id,
  w.created_at,
  w.deleted_at
FROM workspaces w
ORDER BY w.created_at DESC
LIMIT 100;

-- Then, filter for test/demo workspaces
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

-- ============================================
-- STEP 3: Check Membership Rows
-- ============================================

-- Count members per workspace before deleting
SELECT
  wm.workspace_id,
  w.name AS workspace_name,
  count(*) AS member_count
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
GROUP BY wm.workspace_id, w.name
ORDER BY member_count DESC;

-- ============================================
-- STEP 4: Soft Delete Test Workspaces
-- ============================================
-- 
-- IMPORTANT: Replace 'PUT-ID-1-HERE', 'PUT-ID-2-HERE' with actual IDs from Step 2
-- 
-- Option A: Soft Delete (Recommended - preserves data)
-- 
-- UPDATE workspaces
-- SET deleted_at = NOW()
-- WHERE id IN (
--   'PUT-ID-1-HERE',
--   'PUT-ID-2-HERE'
-- );
--
-- ============================================
-- STEP 5: Hard Delete (Only if you're sure)
-- ============================================
-- 
-- WARNING: Hard delete permanently removes data
-- Only use if you're certain about cascade behavior
-- 
-- First, delete memberships:
-- DELETE FROM workspace_members
-- WHERE workspace_id IN (
--   'PUT-ID-1-HERE',
--   'PUT-ID-2-HERE'
-- );
--
-- Then, delete workspaces:
-- DELETE FROM workspaces
-- WHERE id IN (
--   'PUT-ID-1-HERE',
--   'PUT-ID-2-HERE'
-- );
--
-- ============================================
-- STEP 6: Verify Deletion
-- ============================================

-- Check that deleted workspaces are gone from active list
SELECT
  w.id,
  w.name,
  w.organization_id,
  w.created_at,
  w.deleted_at
FROM workspaces w
WHERE w.deleted_at IS NULL
ORDER BY w.created_at DESC;

-- ============================================
-- NOTES
-- ============================================
--
-- 1. The backend now filters deleted workspaces for both ADMIN and MEMBER/VIEWER
-- 2. After deletion, GET /api/workspaces should not return deleted workspaces
-- 3. If you still see deleted workspaces in the dropdown, check:
--    - Backend query filters deletedAt IS NULL (FIXED)
--    - Frontend doesn't cache old workspace list
--    - Clear localStorage: zephix.activeWorkspaceId
--
-- ============================================
