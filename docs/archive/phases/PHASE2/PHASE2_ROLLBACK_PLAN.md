# Phase 2 Rollback Plan

**Service:** zephix-backend  
**Platform:** Railway  
**Migration:** `1786000000000-Phase2ResourceSchemaUpdates`

---

## When to Rollback

Rollback Phase 2 if:
- Migration causes data corruption
- Schema changes break existing queries
- Conflict enforcement causes production issues
- Any critical production error related to Phase 2 changes

**Do NOT rollback for:**
- Test failures (fix tests instead)
- Non-critical warnings
- Performance issues (optimize instead)

---

## Rollback Steps

### Step 1: Revert Migration

**Command:**
```bash
railway run --service zephix-backend -- sh -lc "cd zephix-backend && npm run migration:revert"
```

**Expected output:**
```
Migration Phase2ResourceSchemaUpdates1786000000000 has been reverted successfully.
```

**Verify rollback:**
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id,name,timestamp FROM migrations ORDER BY id DESC LIMIT 10;"'
```

The Phase 2 migration should no longer appear in the list.

### Step 2: Verify Schema Reverted

**Check resources.workspace_id removed:**
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT column_name
FROM information_schema.columns
WHERE table_name = '\''resources'\'' AND column_name = '\''workspace_id'\'';"'
```

**Expected:** No rows returned

**Check resource_allocations.organization_id nullable:**
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = '\''resource_allocations'\''
AND column_name = '\''organization_id'\'';"'
```

**Expected:** `is_nullable = 'YES'`

**Check resource_allocations.units_type removed:**
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT column_name
FROM information_schema.columns
WHERE table_name = '\''resource_allocations'\''
AND column_name = '\''units_type'\'';"'
```

**Expected:** No rows returned

**Check resource_conflicts.organization_id removed:**
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT column_name
FROM information_schema.columns
WHERE table_name = '\''resource_conflicts'\''
AND column_name = '\''organization_id'\'';"'
```

**Expected:** No rows returned

### Step 3: Redeploy Previous Commit

**Option A: Railway Dashboard**
1. Go to Railway Dashboard
2. Select **Zephix** project
3. Select **zephix-backend** service
4. Go to **Deployments** tab
5. Find the commit **before** Phase 2 (commit before `cdd9c00`)
6. Click **Redeploy** on that commit
7. Wait for deployment to show **Success** and **Active**

**Option B: Railway CLI**
```bash
# Find the commit before Phase 2
git log --oneline | grep -A 1 "Phase 2" | tail -1

# Note the commit SHA, then redeploy
railway up --service zephix-backend
```

### Step 4: Verify Deployment

```bash
curl -s https://zephix-backend-production.up.railway.app/api/version | jq .
```

**Expected:** `commitSha` should match the pre-Phase 2 commit.

### Step 5: Data Cleanup (If Needed)

**Only if migration rollback fails or leaves orphaned data:**

**Check for orphaned conflict rows:**
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT COUNT(*) as orphaned_conflicts
FROM resource_conflicts
WHERE organization_id IS NULL;"'
```

**If orphaned conflicts exist:**
```bash
# Option 1: Delete orphaned conflicts (if safe)
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
DELETE FROM resource_conflicts
WHERE organization_id IS NULL;"'

# Option 2: Backfill organization_id from resources (if possible)
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
UPDATE resource_conflicts rc
SET organization_id = r.organization_id
FROM resources r
WHERE rc.resource_id = r.id
AND rc.organization_id IS NULL
AND r.organization_id IS NOT NULL;"'
```

**Check for resource_allocations with null organization_id:**
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT COUNT(*) as null_org_allocations
FROM resource_allocations
WHERE organization_id IS NULL;"'
```

**If null allocations exist:**
```bash
# Backfill from resources
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
UPDATE resource_allocations ra
SET organization_id = r.organization_id
FROM resources r
WHERE ra.resource_id = r.id
AND ra.organization_id IS NULL
AND r.organization_id IS NOT NULL;"'
```

---

## Rollback Verification Checklist

- [ ] Migration reverted successfully
- [ ] Migration row removed from migrations table
- [ ] `resources.workspace_id` column removed
- [ ] `resource_allocations.organization_id` is nullable again
- [ ] `resource_allocations.units_type` column removed
- [ ] `resource_conflicts.organization_id` column removed
- [ ] Previous commit deployed and active
- [ ] `/api/version` shows pre-Phase 2 commit SHA
- [ ] No orphaned data in resource_conflicts
- [ ] No null organization_id in resource_allocations (or backfilled)

---

## Post-Rollback Actions

1. **Document the issue:**
   - What failed?
   - Why did it fail?
   - What was the impact?

2. **Fix the issue:**
   - Address the root cause
   - Update migration if needed
   - Re-test locally

3. **Re-deploy when ready:**
   - Follow deployment guide again
   - Verify all checks pass

---

## Emergency Contacts

If rollback fails or causes issues:
1. Check Railway logs: `railway logs --service zephix-backend`
2. Check database connection: `railway run --service zephix-backend -- psql "$DATABASE_URL" -c "SELECT 1;"`
3. Review migration down() method in `1786000000000-Phase2ResourceSchemaUpdates.ts`

---

**Last Updated:** 2026-02-01

