# Railway Deployment Sequence

## Prerequisites

- ✅ Bootstrap migration exists: `0000000000000-InitCoreSchema.ts`
- ✅ Template Center v1 migrations exist: `1769000000101-1769000000108`
- ✅ Database connection configured via `DATABASE_URL`

## Execution Sequence

### Step 1: Database Fingerprint
**Verify target database before running migrations**

```bash
npm run db:fingerprint
```

**Expected Output:**
- `database_url_host`: `ballast.proxy.rlwy.net`
- `db`: `public` (or your Railway database name)
- `server_ip`: Railway IP address
- `migrations_rows`: `0` (on fresh DB) or existing count

**✅ Confirmation:**
- Host matches `ballast.proxy.rlwy.net`
- Schema is `public`

---

### Step 2: Run Bootstrap Migration
**Execute initial migration chain**

```bash
npm run migration:run
```

**Expected Output:**
- `0000000000000-InitCoreSchema` executes first
- Creates core tables: `organizations`, `users`, `user_organizations`, `workspaces`, `projects`
- Creates `pgcrypto` extension
- No errors

**✅ Confirmation:**
- Migration `0000000000000-InitCoreSchema` appears in execution log
- No "relation does not exist" errors

---

### Step 3: Run Template Center v1 Migrations
**Re-run migration command to execute Template Center migrations**

```bash
npm run migration:run
```

**Expected Output:**
- Migrations `1769000000101` through `1769000000108` execute
- Creates `templates`, `lego_blocks`, `template_blocks` tables
- Creates indexes and constraints
- No errors

**✅ Confirmation:**
- All 8 Template Center migrations appear in execution log
- No foreign key constraint errors

---

### Step 4: Verification Queries
**Run verification queries to confirm schema integrity**

#### 4.1: Verify Core Tables Exist

```sql
SELECT to_regclass('public.users') AS users;
SELECT to_regclass('public.organizations') AS organizations;
SELECT to_regclass('public.user_organizations') AS user_organizations;
SELECT to_regclass('public.workspaces') AS workspaces;
SELECT to_regclass('public.projects') AS projects;
```

**Expected:** All return table names (not null)

#### 4.2: Verify Template Center Tables Exist

```sql
SELECT to_regclass('public.templates') AS templates;
SELECT to_regclass('public.lego_blocks') AS lego_blocks;
SELECT to_regclass('public.template_blocks') AS template_blocks;
```

**Expected:** All return table names (not null)

#### 4.3: Verify Row Counts

```sql
SELECT COUNT(*) AS templates_count FROM templates;
SELECT COUNT(*) AS lego_blocks_count FROM lego_blocks;
SELECT COUNT(*) AS template_blocks_count FROM template_blocks;
```

**Expected:** All counts >= 0 (may be 0 on fresh DB)

#### 4.4: Verify Data Integrity - No Orphaned Project Templates

```sql
SELECT COUNT(*) AS orphaned_count
FROM project_templates
WHERE organization_id IS NOT NULL
  AND template_id IS NULL;
```

**Expected:** `0` (no orphaned records)

#### 4.5: Verify Default Template Constraints

```sql
SELECT
  organization_id,
  COUNT(*) AS default_count
FROM templates
WHERE is_default = true
GROUP BY organization_id
HAVING COUNT(*) > 1;
```

**Expected:** No rows returned (each org has <= 1 default template)

---

## Complete Verification Script

```sql
-- Core tables
SELECT
  'users' AS table_name,
  to_regclass('public.users') IS NOT NULL AS exists
UNION ALL
SELECT 'organizations', to_regclass('public.organizations') IS NOT NULL
UNION ALL
SELECT 'user_organizations', to_regclass('public.user_organizations') IS NOT NULL
UNION ALL
SELECT 'workspaces', to_regclass('public.workspaces') IS NOT NULL
UNION ALL
SELECT 'projects', to_regclass('public.projects') IS NOT NULL
UNION ALL
SELECT 'templates', to_regclass('public.templates') IS NOT NULL
UNION ALL
SELECT 'lego_blocks', to_regclass('public.lego_blocks') IS NOT NULL
UNION ALL
SELECT 'template_blocks', to_regclass('public.template_blocks') IS NOT NULL;

-- Row counts
SELECT
  'templates' AS table_name,
  COUNT(*) AS row_count
FROM templates
UNION ALL
SELECT 'lego_blocks', COUNT(*) FROM lego_blocks
UNION ALL
SELECT 'template_blocks', COUNT(*) FROM template_blocks;

-- Data integrity checks
SELECT
  'orphaned_project_templates' AS check_name,
  COUNT(*) AS violation_count
FROM project_templates
WHERE organization_id IS NOT NULL AND template_id IS NULL
UNION ALL
SELECT
  'multiple_defaults_per_org',
  COUNT(DISTINCT organization_id)
FROM (
  SELECT organization_id
  FROM templates
  WHERE is_default = true
  GROUP BY organization_id
  HAVING COUNT(*) > 1
) AS violations;
```

**Expected Results:**
- All `exists` columns = `true`
- All `row_count` >= 0
- All `violation_count` = 0

---

## Troubleshooting

### Issue: Migration fails with "relation does not exist"
**Solution:** Ensure bootstrap migration (`0000000000000-InitCoreSchema`) ran first

### Issue: Template Center migrations fail with foreign key errors
**Solution:** Verify core tables exist using Step 4.1 queries

### Issue: Wrong database host
**Solution:** Verify `DATABASE_URL` environment variable points to Railway

### Issue: Orphaned project_templates found
**Solution:** Run data cleanup script before proceeding

---

## Success Criteria

✅ All 8 core tables exist
✅ All 3 Template Center tables exist
✅ Row counts are non-negative
✅ No orphaned project_templates
✅ Each organization has <= 1 default template
✅ All migrations executed without errors

---

## Next Steps After Verification

1. Seed initial data (if required)
2. Run application health checks
3. Verify API endpoints respond correctly
4. Monitor logs for any runtime errors

