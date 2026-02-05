# Template Center v1 - E2E Fix Status

## Current Status

### ✅ Migrations Complete
All 8 Template Center v1 migrations executed successfully.

### ❌ E2E Tests Blocked

**Error:** Jest worker encountered 4 child process exceptions, exceeding retry limit

**Root Cause:** TypeScript compilation errors in test files, not circular dependency

## TypeScript Errors Found

1. **Missing module:** `Cannot find module '../src/auth/auth.module'`
   - File: `test/brd.e2e-spec.ts:8:28`
   - Fix: Update import path or create missing module

2. **JSON import:** `Cannot find module '../src/brd/schema/brd.seed.json'`
   - File: `test/brd.e2e-spec.ts:10:27`
   - Fix: Add `--resolveJsonModule` to tsconfig or use `require()`

3. **Workflow templates test errors:**
   - Multiple TypeScript errors in `src/workflows/__tests__/workflow-templates.controller.spec.ts`
   - These are unit test errors, not E2E, but they block the test suite

## Module Dependency Analysis

### ✅ No Circular Dependency Found

**ProjectsModule:**
- Imports `Template` and `TemplateBlock` entities directly (not TemplateModule)
- No service imports from TemplateModule

**TemplateModule:**
- Imports `Project` and `Task` entities directly (not ProjectsModule)
- No service imports from ProjectsModule

**Conclusion:** Modules are correctly isolated. No circular dependency exists.

## DB Verification Status

**Issue:** Cannot connect to Railway database via local psql
- Error: `database "malikadeel" does not exist`
- DATABASE_URL is set but psql is using local socket

**Solution:** Use Railway dashboard or Node.js script with DATABASE_URL

## Next Steps

1. **Fix TypeScript compilation errors:**
   - Fix `test/brd.e2e-spec.ts` import paths
   - Fix workflow templates test file
   - Add `resolveJsonModule` to tsconfig if needed

2. **Verify DB state:**
   - Use Railway dashboard to run validation queries
   - Or create Node.js script that uses DATABASE_URL directly

3. **Re-run E2E:**
   - `npm run test:e2e -- --runInBand`
   - Should pass after TypeScript errors are fixed

## Validation Queries (Run via Railway Dashboard)

```sql
-- Templates table exists and has v1 columns
SELECT COUNT(*) FROM templates;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'templates'
ORDER BY ordinal_position;

-- Lego blocks table exists and has v1 columns
SELECT COUNT(*) FROM lego_blocks;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'lego_blocks'
ORDER BY ordinal_position;

-- Template blocks v1 table exists
SELECT to_regclass('public.template_blocks') AS v1_table;
SELECT to_regclass('public.template_blocks_legacy') AS legacy_table;

-- Project templates mapping populated
SELECT
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL) AS pt_with_org,
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL AND template_id IS NOT NULL) AS pt_with_org_and_template_id,
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL AND template_id IS NULL) AS pt_with_org_missing_template_id
FROM project_templates;

-- Template blocks migrated
SELECT COUNT(*) AS v1_blocks FROM template_blocks;
SELECT COUNT(*) AS legacy_blocks FROM template_blocks_legacy;

-- Unmigrated legacy rows
SELECT COUNT(*) AS unmapped_legacy_rows
FROM template_blocks_legacy tbleg
LEFT JOIN project_templates pt ON pt.id = tbleg.template_id
LEFT JOIN templates t ON t.id = pt.template_id
WHERE t.id IS NULL;

-- Default enforcement sanity
SELECT organization_id, COUNT(*) AS defaults
FROM templates
WHERE is_default = true
AND organization_id IS NOT NULL
GROUP BY organization_id
HAVING COUNT(*) > 1;

-- Non-system org guardrail
SELECT COUNT(*) AS violating_rows
FROM templates
WHERE (is_system = false OR is_system IS NULL)
AND organization_id IS NULL;
```




