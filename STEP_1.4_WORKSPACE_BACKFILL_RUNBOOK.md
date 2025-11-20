# Step 1.4 — Workspace Backfill Runbook

## Overview

This runbook provides step-by-step instructions for running the workspace ownership and members backfill script on Railway (or any environment).

The script is **idempotent** and **safe to re-run** multiple times.

---

## Prerequisites

1. **Database Access**: Ensure `DATABASE_URL` is set in your environment
2. **Backup**: Consider taking a database backup before running (recommended for production)
3. **Access**: SSH or Railway CLI access to run the script

---

## Step 1: Dry Run (Preview Changes)

**Always run in dry-run mode first** to preview what changes will be made.

### On Railway (via CLI):

```bash
# Set DATABASE_URL from Railway
export DATABASE_URL="your-railway-database-url"

# Run dry-run
DRY_RUN=true npm run backfill:workspace-owners
```

### On Railway (via Environment Variable):

1. Go to Railway project settings
2. Add environment variable: `DRY_RUN=true`
3. Run the script: `npm run backfill:workspace-owners`
4. Remove `DRY_RUN` environment variable after review

### Expected Output:

```
🚀 Starting workspace ownership and members backfill...
🔍 DRY RUN MODE - No changes will be applied

✅ Database connected
Found X workspaces without owner_id

[DRY RUN] Would set owner_id=xxx for workspace Name (id)
  [DRY RUN] Would create workspace_member record (owner role)

============================================================
BACKFILL SUMMARY
============================================================
Workspaces scanned: X
Workspaces updated: X
OwnerId changes: X
Members created: X
Members updated: X
Skipped: 0
Errors: 0

⚠️  This was a DRY RUN. No changes were applied.
Run without --dry-run to apply changes.
```

### Review Checklist:

- [ ] Review the number of workspaces that will be updated
- [ ] Verify owner assignments look correct
- [ ] Check for any skipped workspaces (and understand why)
- [ ] Ensure no errors are reported
- [ ] If errors exist, investigate and fix before proceeding

---

## Step 2: Apply Changes (Production Run)

**Only proceed after reviewing dry-run output.**

### On Railway (via CLI):

```bash
# Ensure DRY_RUN is NOT set
unset DRY_RUN

# Run the script
npm run backfill:workspace-owners
```

### On Railway (via Environment Variable):

1. Remove `DRY_RUN` environment variable (if set)
2. Run the script: `npm run backfill:workspace-owners`

### Expected Output:

```
🚀 Starting workspace ownership and members backfill...

✅ Database connected
Found X workspaces without owner_id

✅ Set owner_id=xxx for workspace Name (id)
  ✅ Created workspace_member record (owner role)

============================================================
BACKFILL SUMMARY
============================================================
Workspaces scanned: X
Workspaces updated: X
OwnerId changes: X
Members created: X
Members updated: X
Skipped: 0
Errors: 0

✅ Backfill completed successfully
```

---

## Step 3: Verification

After running the script, verify the changes:

### Check Workspaces:

```sql
-- Count workspaces with and without ownerId
SELECT
  COUNT(*) FILTER (WHERE owner_id IS NOT NULL) as with_owner,
  COUNT(*) FILTER (WHERE owner_id IS NULL) as without_owner,
  COUNT(*) as total
FROM workspaces
WHERE deleted_at IS NULL;
```

### Check Workspace Members:

```sql
-- Count workspace_members rows
SELECT COUNT(*) as total_members
FROM workspace_members;

-- Check for owner role members
SELECT COUNT(*) as owner_members
FROM workspace_members
WHERE role = 'owner';
```

### Sample Workspace Check:

```sql
-- Check a specific workspace
SELECT
  w.id,
  w.name,
  w.owner_id,
  u.email as owner_email,
  wm.role as member_role
FROM workspaces w
LEFT JOIN users u ON u.id = w.owner_id
LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = w.owner_id
WHERE w.deleted_at IS NULL
LIMIT 10;
```

---

## Troubleshooting

### Issue: "No eligible users found in organization"

**Cause**: Organization has no active users in `user_organizations` table.

**Solution**:
1. Check if organization has users: `SELECT * FROM user_organizations WHERE organization_id = 'xxx' AND is_active = true;`
2. If no users exist, create user_organizations entries first
3. Re-run backfill

### Issue: "Error processing workspace"

**Cause**: Database constraint violation or invalid data.

**Solution**:
1. Check the error message in the output
2. Verify the workspace data: `SELECT * FROM workspaces WHERE id = 'xxx';`
3. Check if owner candidate exists: `SELECT * FROM users WHERE id = 'xxx';`
4. Fix data issues and re-run

### Issue: Script hangs or times out

**Cause**: Large number of workspaces or database connection issues.

**Solution**:
1. Check database connection: Verify `DATABASE_URL` is correct
2. Check database load: Monitor Railway database metrics
3. Run in smaller batches (modify script if needed)
4. Re-run script (it's idempotent, safe to re-run)

---

## Rollback

**The script is idempotent**, but if you need to rollback:

### Option 1: Re-run with different logic

Modify the script to revert changes (not recommended - better to fix forward).

### Option 2: Manual SQL rollback

```sql
-- Remove ownerId from workspaces (if needed)
UPDATE workspaces
SET owner_id = NULL
WHERE id IN ('workspace-id-1', 'workspace-id-2');

-- Remove workspace_members rows (if needed)
DELETE FROM workspace_members
WHERE workspace_id IN ('workspace-id-1', 'workspace-id-2');
```

**Note**: Only rollback if absolutely necessary. The backfill data is required for workspace membership feature to work correctly.

---

## Post-Backfill Steps

1. **Verify Feature Flag**: Ensure `ZEPHIX_WS_MEMBERSHIP_V1` is set correctly
2. **Test Workspace Access**: Verify users can access their workspaces
3. **Monitor Logs**: Watch for any access-related errors
4. **Update Documentation**: Note that backfill has been run

---

## Safety Notes

✅ **Safe to re-run**: The script is idempotent - running multiple times produces the same result

✅ **Transaction-safe**: Each workspace is processed in a transaction

✅ **Non-destructive**: Only adds missing data, doesn't delete existing data

⚠️ **Read-only in dry-run**: Dry-run mode never modifies data

⚠️ **Production-ready**: Script has been tested with e2e tests

---

## Support

If you encounter issues:

1. Check the error messages in the script output
2. Review the troubleshooting section above
3. Check database logs in Railway
4. Verify `DATABASE_URL` is correct
5. Ensure database has proper permissions

---

## Script Location

- **Script**: `src/scripts/backfill-workspace-owners-and-members.ts`
- **Service**: `src/modules/workspaces/services/workspace-backfill.service.ts`
- **Package.json command**: `npm run backfill:workspace-owners`

