-- ============================================
-- DATABASE CLEANUP: Execute These Queries
-- ============================================
-- 
-- IMPORTANT: Run these queries in order in your database client
-- (psql, pgAdmin, DBeaver, etc.)
--
-- Database: postgresql://postgres:****@ballast.proxy.rlwy.net:38318/railway
--
-- ============================================
-- STEP 1: Find Test Workspaces
-- ============================================
-- Run this query first and paste the results

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
-- STEP 2: Soft Delete Test Workspaces
-- ============================================
-- AFTER you paste Step 1 results, I will provide the exact UPDATE statement
-- with your workspace IDs filled in.
--
-- It will look like this (replace IDs with actual values):
--
-- UPDATE workspaces
-- SET deleted_at = NOW()
-- WHERE id IN (
--   'ID_1',
--   'ID_2'
-- );

-- ============================================
-- STEP 3: Verify Cleanup
-- ============================================
-- Run this AFTER the UPDATE to confirm zero test workspaces remain active

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

-- Expected result: Zero rows (empty result set)

-- ============================================
-- STEP 4: Verify Active Workspaces
-- ============================================
-- Optional: Check what active workspaces remain

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
-- After running Step 2 UPDATE:
-- 1. Clear browser localStorage: zephix.activeWorkspaceId
-- 2. Refresh and login
-- 3. Verify dropdown shows only real workspaces
-- 4. Check Network tab:
--    - GET /api/workspaces: NO x-workspace-id header
--    - GET /api/projects: HAS x-workspace-id header (after selecting workspace)
--
-- ============================================
