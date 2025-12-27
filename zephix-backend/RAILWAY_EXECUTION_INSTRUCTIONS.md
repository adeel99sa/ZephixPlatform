# Railway Execution Instructions

## Prerequisites

Before executing the Railway deployment sequence, you must:

1. **Set DATABASE_URL environment variable**
   - Get the Railway database connection string from Railway dashboard
   - Format: `postgresql://user:password@host:port/database`
   - Railway host should be `ballast.proxy.rlwy.net`

2. **Export DATABASE_URL locally** (for local execution):
   ```bash
   export DATABASE_URL="postgresql://postgres:password@ballast.proxy.rlwy.net:5432/railway"
   ```

   Or add to `.env` file in `zephix-backend/`:
   ```
   DATABASE_URL=postgresql://postgres:password@ballast.proxy.rlwy.net:5432/railway
   ```

## Execution Sequence

### Step 1: Database Fingerprint
```bash
cd zephix-backend
npm run db:fingerprint
```

**Expected Output:**
```json
{
  "database_url_host": "ballast.proxy.rlwy.net",
  "db": "railway",
  "server_ip": "<Railway IP>",
  "server_port": 5432,
  "server_version": "PostgreSQL X.X",
  "migrations_rows": 0
}
```

**✅ Confirmation Required:**
- `database_url_host` must be `ballast.proxy.rlwy.net`
- If different, STOP and verify DATABASE_URL

---

### Step 2: Run Bootstrap Migration
```bash
npm run migration:run
```

**Expected Output:**
- Migration `0000000000000-InitCoreSchema` executes
- Creates: `organizations`, `users`, `user_organizations`, `workspaces`, `projects`
- Creates `pgcrypto` extension
- No errors

**✅ Confirmation:**
- Check migration log for `0000000000000-InitCoreSchema`
- Verify no "relation does not exist" errors

---

### Step 3: Run Template Center v1 Migrations
```bash
npm run migration:run
```

**Expected Output:**
- Migrations `1769000000101` through `1769000000108` execute
- Creates: `templates`, `lego_blocks`, `template_blocks` tables
- No foreign key constraint errors

**✅ Confirmation:**
- All 8 Template Center migrations appear in execution log
- No errors

---

### Step 4: Verification Queries

Run these queries via Railway SQL console or psql:

```sql
-- Core tables
SELECT to_regclass('public.users') AS users;
SELECT to_regclass('public.organizations') AS organizations;
SELECT to_regclass('public.user_organizations') AS user_organizations;
SELECT to_regclass('public.workspaces') AS workspaces;
SELECT to_regclass('public.projects') AS projects;

-- Template Center tables
SELECT to_regclass('public.templates') AS templates;
SELECT to_regclass('public.lego_blocks') AS lego_blocks;
SELECT to_regclass('public.template_blocks') AS template_blocks;

-- Row counts
SELECT COUNT(*) AS templates_count FROM templates;
SELECT COUNT(*) AS lego_blocks_count FROM lego_blocks;
SELECT COUNT(*) AS template_blocks_count FROM template_blocks;

-- Data integrity
SELECT COUNT(*) AS orphaned_count
FROM project_templates
WHERE organization_id IS NOT NULL AND template_id IS NULL;

-- Default template constraints
SELECT organization_id, COUNT(*) AS default_count
FROM templates
WHERE is_default = true
GROUP BY organization_id
HAVING COUNT(*) > 1;
```

**Expected Results:**
- All `to_regclass` queries return table names (not null)
- All row counts >= 0
- `orphaned_count` = 0
- No rows returned for default template check

---

## Alternative: Execute via Railway CLI

If you have Railway CLI installed and linked:

```bash
# Set Railway context
railway link

# Run fingerprint (requires Railway CLI with DB access)
railway run npm run db:fingerprint

# Run migrations
railway run npm run migration:run
railway run npm run migration:run

# Verify via Railway SQL console
railway connect
```

---

## Stop Conditions

**STOP immediately if:**
- `db:fingerprint` shows host other than `ballast.proxy.rlwy.net`
- Any migration fails with "relation does not exist"
- Foreign key constraint errors occur
- Verification queries show data integrity violations

---

## Current Status

**DATABASE_URL:** Not set locally
**Action Required:** Set DATABASE_URL before proceeding

**Next Steps:**
1. Get Railway database connection string
2. Export DATABASE_URL or add to `.env`
3. Re-run `npm run db:fingerprint`
4. Proceed with migration sequence if fingerprint confirms Railway

