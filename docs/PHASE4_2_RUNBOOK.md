# Phase 4.2 Dashboard Studio - Operator Runbook

**Purpose**: Execute Phase 4.2 production closeout steps in order.

**Prerequisites**:
- Access to Railway Dashboard (https://railway.app)
- Valid credentials for authentication
- `jq` installed locally (for verification scripts)

---

## Step 1: Verify Production Version

**Command**:
```bash
curl -s https://zephix-backend-production.up.railway.app/api/version | jq '{commitSha: .data.commitSha, commitShaTrusted: .data.commitShaTrusted}'
```

**Expected Output**:
```json
{
  "commitSha": "f64646d837fab2213e3de1356f9bf8b99bb6b7e8",
  "commitShaTrusted": true
}
```

**Pass Criteria**:
- `commitShaTrusted` must be `true`
- Note the actual `commitSha` value

**If `commitShaTrusted` is `false`**: Stop and investigate Railway deployment configuration.

---

## Step 2: Login (Non-Interactive)

**Command**:
```bash
export BASE="https://zephix-backend-production.up.railway.app"
export EMAIL="your-email@example.com"
export PASSWORD="your-password"
source scripts/auth-login.sh
```

**Expected Output**:
```
🔐 Logging in...
✅ Login successful
   Token: abc123...xyz789
   Expires in: 3600s

💡 Token exported to TOKEN environment variable in current shell
```

**Verify**: Check that `TOKEN` is set:
```bash
echo $TOKEN | cut -c1-10
```

---

## Step 3: Run Migration (Railway Dashboard Shell)

**Method**: Use Railway Dashboard Shell (no CLI auth required)

**Steps**:
1. Open Railway Dashboard: https://railway.app
2. Navigate to your project → `zephix-backend` service
3. Click on **"Shell"** tab (or **"Deployments"** → select latest deployment → **"Shell"**)
4. In the shell, run:
   ```bash
   cd zephix-backend
   npm run migration:run
   ```

**Expected Output**: Migration logs showing `Phase4DashboardStudio1767550031000` executed.

**Verify Migration Executed**:
```bash
psql $DATABASE_URL -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 10;"
```

**Expected**: `Phase4DashboardStudio1767550031000` appears in the results.

**Verify Templates Seeded**:
```bash
psql $DATABASE_URL -c "SELECT key, COUNT(*) FROM dashboard_templates GROUP BY key ORDER BY key;"
```

**Expected Output**:
```
key                              | count
---------------------------------+-------
exec_overview                    |     1
pmo_delivery_health              |     1
pm_agile_sprint                 |     1
program_rollup                   |     1
resource_utilization_conflicts   |     1
```

**If migration fails**: Stop and investigate. Do not proceed to verification.

---

## Step 4: Run Verification Runner Script

**Command** (from local terminal with TOKEN from Step 2):
```bash
export BASE="https://zephix-backend-production.up.railway.app"
# TOKEN should already be set from Step 2
bash scripts/run-phase4-dashboard-verify.sh
```

**Expected Output**: All checks pass with ✅ marks:
- ✅ Preflight: commitShaTrusted = true
- ✅ A. GET /api/dashboards/templates returns at least 1 template
- ✅ B. POST /api/dashboards/activate-template returns 201 and dashboardId
- ✅ C. GET /api/dashboards returns list including that dashboardId
- ✅ D. GET /api/dashboards/{id} returns widgets array non-empty
- ✅ E. Analytics widget endpoints return 200 with required fields
- ✅ F. AI suggest returns widget types from allowlist
- ✅ F. AI generate returns dashboard schema that passes backend schema guard

**If any check fails**: Stop and investigate. Check requestId in error output.

---

## Step 5: Paste Outputs into Release Log

**File**: `docs/RELEASE_LOG_PHASE4.md`

**Update these sections**:

1. **Production Commit SHA** (if different from expected):
   - Update "Production Commit SHA" field with actual value from Step 1

2. **Migration Executed Proof**:
   - Mark migration checkbox as `[x]`
   - Paste output from `SELECT * FROM migrations ORDER BY id DESC LIMIT 10;`

3. **Template Seed Counts**:
   - Mark template seed checkbox as `[x]`
   - Paste output from `SELECT key, COUNT(*) FROM dashboard_templates GROUP BY key ORDER BY key;`

4. **Verification Script Output**:
   - Paste full output from Step 4 under "Verification Script Output" section

5. **Manual Smoke Checklist**:
   - Mark each item as `[x]` after testing in Swagger UI
   - Include `x-workspace-id` header for all requests

6. **Final Signoff**:
   - Mark completed items as `[x]`
   - Leave pending items as `[ ]` until completed

---

## Troubleshooting

### Migration Fails
- Check Railway service logs
- Verify DATABASE_URL is set correctly
- Check migration file exists: `zephix-backend/src/migrations/1767550031000-Phase4DashboardStudio.ts`

### Verification Script Fails with 401/403
- Token may have expired (re-run Step 2)
- Check user has access to organization and workspace

### Verification Script Fails with 404
- Check route order (should be fixed by CI checks)
- Verify migration completed successfully

### Verification Script Fails with 500
- Check backend logs in Railway
- Check requestId in error output for correlation

---

## Completion Checklist

- [ ] Step 1: Version verified (commitShaTrusted = true)
- [ ] Step 2: Login successful (TOKEN exported)
- [ ] Step 3: Migration executed and verified
- [ ] Step 3: Templates seeded and counted
- [ ] Step 4: Verification script passed all checks
- [ ] Step 5: Release log updated with all proofs
- [ ] Manual smoke tests completed in Swagger UI

**Only mark Phase 4.2 complete when all items above are checked.**


