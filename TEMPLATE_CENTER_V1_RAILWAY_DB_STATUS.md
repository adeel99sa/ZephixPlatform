# Template Center v1 - Railway Database Status

## Current State

**Railway Database:** `ballast.proxy.rlwy.net` (confirmed via DATABASE_URL)

### Database Status
- ✅ Connected successfully
- ❌ **Database is completely empty** - only `migrations` table exists
- ❌ **0 migrations executed** on Railway
- ❌ **No base tables exist** (users, organizations, projects, etc.)

## Issue

When attempting to run all migrations on Railway:
1. First 2 migrations succeed (ProductionBaseline, EnsureProjectsTableExists)
2. Migration fails at `CreateResourceManagementSystem1757227595840` because `users` table doesn't exist
3. This blocks all subsequent migrations, including Template Center v1 migrations

## Root Cause

The Railway database appears to be a **fresh/empty database** that needs:
1. All base migrations to run first (users, organizations, workspaces, etc.)
2. Then Template Center v1 migrations can run

## Solution Options

### Option 1: Run All Migrations in Order (Recommended)
The Railway database needs all migrations from the beginning. The migration system should handle this, but there's a dependency issue where an early migration references `users` table that doesn't exist yet.

**Action:** Fix the migration dependency order or ensure base tables are created first.

### Option 2: Seed Railway Database
If Railway should already have data, restore from a backup or seed script.

### Option 3: Run Only Template Center v1 Migrations (If Base Exists)
If the base schema exists but migrations table is empty, we could manually mark base migrations as executed and run only Template Center v1 migrations.

## Template Center v1 Migrations Status

**Files Created:** ✅ All 8 migrations exist
- `1769000000101-AddTemplateV1Columns.ts`
- `1769000000102-AddLegoBlockV1Columns.ts`
- `1769000000103-CreateTemplateBlocksV1.ts`
- `1769000000104-AddProjectTemplateSnapshot.ts`
- `1769000000105-AddTemplateIdToProjectTemplates.ts`
- `1769000000106-CreateAndLinkTemplatesFromProjectTemplates.ts`
- `1769000000107-BackfillTemplatesV1Fields.ts`
- `1769000000108-BackfillTemplateBlocksV1.ts`

**Execution Status:** ❌ Not executed on Railway (blocked by base migration failure)

## Next Steps

1. **Determine Railway DB State:**
   - Is Railway supposed to be empty (fresh DB)?
   - Or should it already have base schema?

2. **If Fresh DB:**
   - Fix migration dependency issues
   - Run all migrations from start
   - Template Center v1 migrations will run automatically after base migrations

3. **If DB Should Have Data:**
   - Restore from backup
   - Or seed base schema
   - Then run Template Center v1 migrations

## Verification Queries (Once Migrations Run)

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

-- Default enforcement
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




