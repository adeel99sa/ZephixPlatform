# Phase 2 Deployment Guide

**Service:** zephix-backend
**Platform:** Railway
**Date:** [Fill in deployment date]

---

## Quick Start (Automated)

**Prerequisites:**
```bash
export TOKEN="your-auth-token"
export ORG_ID="your-org-id"
export PROJECT_ID="your-project-id"
```

**Run automated verification:**
```bash
./scripts/phase2-deploy-verify.sh
```

This script will:
- Verify local and production commit SHA match
- Run migration in Railway environment
- Verify schema changes
- Run smoke tests

**See manual steps below if you need to deploy first or prefer step-by-step verification.**

---

## Release Checklist

- [ ] **Step 1:** Local repo sanity
- [ ] **Step 2:** Railway CLI access
- [ ] **Step 3:** Pre-deploy proof
- [ ] **Step 4:** Deploy latest main
- [ ] **Step 5:** Post-deploy proof (commitSha must match)
- [ ] **Step 6:** Run migration in Railway environment
- [ ] **Step 7:** Verify schema in Postgres
- [ ] **Step 8:** Smoke tests
  - [ ] 8a. Create resource
  - [ ] 8b. HARD overallocation must block with 409
  - [ ] 8c. SOFT overallocation must succeed and create conflict row
  - [ ] 8d. Capacity endpoint responds
- [ ] **Step 9:** Write release log file

---

## Commands

### Step 1: Local Repo Sanity

```bash
cd /Users/malikadeel/Downloads/ZephixApp
git checkout main
git pull
git status
git rev-parse HEAD
LOCAL_SHA=$(git rev-parse HEAD)
LOCAL_SHORT=$(git rev-parse HEAD | cut -c1-7)
echo "Full SHA: $LOCAL_SHA"
echo "Short SHA: $LOCAL_SHORT"
```

### Step 2: Railway CLI Access

```bash
railway --version
railway status
railway link
```

**If not logged in, run these and stop:**
```bash
railway login
railway link
```

### Step 3: Pre-Deploy Proof

```bash
curl -s https://zephix-backend-production.up.railway.app/api/version | jq .
```

**Record:** PreDeploy commitSha and commitShaTrusted values, or note if missing.

### Step 4: Deploy Latest Main

**Railway Dashboard Path (Preferred):**
1. Go to Railway Dashboard
2. Select **Zephix** project
3. Select **zephix-backend** service
4. Click **Deployments** tab
5. Find latest main commit
6. Click **Redeploy** (or three dots menu → Redeploy)
7. Wait for deployment status to show **Success**
8. Confirm deployment is **Active**

**Stop if:** Deployment fails or never becomes Active.

### Step 5: Post-Deploy Proof (commitSha Must Match)

```bash
LOCAL_SHORT=$(git rev-parse HEAD | cut -c1-7)
echo "Local short SHA: $LOCAL_SHORT"

VERSION_RESPONSE=$(curl -s https://zephix-backend-production.up.railway.app/api/version)
echo "$VERSION_RESPONSE" | jq .

PROD_SHA=$(echo "$VERSION_RESPONSE" | jq -r '.data.commitSha // empty')
PROD_TRUSTED=$(echo "$VERSION_RESPONSE" | jq -r '.data.commitShaTrusted // false')
PROD_SHORT=$(echo "$PROD_SHA" | cut -c1-7)

echo "Production SHA (full): $PROD_SHA"
echo "Production SHA (short): $PROD_SHORT"
echo "Commit SHA trusted: $PROD_TRUSTED"

if [ "$PROD_TRUSTED" != "true" ] && [ "$PROD_SHA" != "unknown" ]; then
  echo "⚠️  WARNING: commitShaTrusted is false (SHA may not reflect actual deployment)"
fi

if [ "$LOCAL_SHORT" = "$PROD_SHORT" ]; then
  echo "✅ SHA matches"
else
  echo "❌ SHA mismatch"
fi
```

**Stop if:**
- commitSha is 'unknown' and commitShaTrusted is false (Railway not setting RAILWAY_GIT_COMMIT_SHA)
- commitSha missing or mismatch after redeploy

### Step 6: Run Migration in Railway Environment

```bash
railway run --service zephix-backend -- sh -lc "cd zephix-backend && npm run migration:run"
```

**Stop if:** Any migration error.

### Step 7: Verify Schema in Postgres

```bash
# Check migration was recorded
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id, name, timestamp FROM migrations ORDER BY id DESC LIMIT 20;"'

# Verify resources.workspace_id
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '\''resources'\'' AND column_name = '\''workspace_id'\'';"'

# Verify resource_allocations.organization_id and units_type
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '\''resource_allocations'\''
AND column_name IN ('\''organization_id'\'','\''units_type'\'')
ORDER BY column_name;"'

# Verify resource_conflicts.organization_id
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '\''resource_conflicts'\''
AND column_name = '\''organization_id'\'';"'
```

**Stop if:** Any missing column or wrong nullability.

### Step 8: Smoke Tests

**Set variables (replace placeholders):**
```bash
export BASE="https://zephix-backend-production.up.railway.app"
export TOKEN="PASTE_TOKEN"
export ORG_ID="PASTE_ORG_ID"
export WORKSPACE_ID="PASTE_WORKSPACE_ID"
export PROJECT_ID="PASTE_PROJECT_ID"
```

**Important:** Workspace-scoped endpoints (conflicts, capacity) require the `x-workspace-id` header. Always include this header when calling these endpoints.

**How to get TOKEN, ORG_ID, WORKSPACE_ID, PROJECT_ID:**

1. **Get TOKEN:**
   - Login to production frontend
   - Open browser DevTools → Application/Storage → Local Storage
   - Find `authToken` or `accessToken` key → Copy value
   - Or use Railway environment variables if available

2. **Get ORG_ID:**
   ```bash
   curl -s "$BASE/api/organizations" \
     -H "Authorization: Bearer $TOKEN" | jq '.data[0].id'
   ```

3. **Get WORKSPACE_ID:**
   ```bash
   export WORKSPACE_ID=$(curl -s "$BASE/api/workspaces" \
     -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')
   ```

4. **Get PROJECT_ID:**
   ```bash
   export PROJECT_ID=$(curl -s "$BASE/api/projects" \
     -H "Authorization: Bearer $TOKEN" \
     -H "x-workspace-id: $WORKSPACE_ID" | jq -r '.data.projects[0].id // .data[0].id')
   ```

**Alternative: Use automated script**
The `scripts/phase2-deploy-verify.sh` script will run all smoke tests automatically if you set the environment variables above.

#### 8a. Create Resource

```bash
RESOURCE_NAME="Smoke Resource $(date +%s)"
RESOURCE_EMAIL="smoke-resource-$(date +%s)@example.com"
RESOURCE_ID=$(curl -s -X POST "$BASE/api/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$RESOURCE_NAME\",\"email\":\"$RESOURCE_EMAIL\",\"role\":\"Developer\",\"organizationId\":\"$ORG_ID\"}" | jq -r '.data.id')
echo "Resource ID: $RESOURCE_ID"
```

**Stop if:** Any 500 error.

#### 8b. HARD Overallocation Must Block with 409

```bash
# First HARD allocation (60%)
curl -i -s -X POST "$BASE/api/resource-allocations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
\"resourceId\":\"$RESOURCE_ID\",
\"projectId\":\"$PROJECT_ID\",
\"unitsType\":\"PERCENT\",
\"allocationPercentage\":60,
\"type\":\"HARD\",
\"startDate\":\"2026-01-01\",
\"endDate\":\"2026-01-31\"
}" | head -n 30

# Second HARD allocation (50%), expect 409
curl -i -s -X POST "$BASE/api/resource-allocations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
\"resourceId\":\"$RESOURCE_ID\",
\"projectId\":\"$PROJECT_ID\",
\"unitsType\":\"PERCENT\",
\"allocationPercentage\":50,
\"type\":\"HARD\",
\"startDate\":\"2026-01-01\",
\"endDate\":\"2026-01-31\"
}" | head -n 30
```

**Stop if:** Second call not 409, or any 500.

#### 8c. SOFT Overallocation Must Succeed and Create Conflict Row

```bash
# First SOFT allocation (60%)
curl -i -s -X POST "$BASE/api/resource-allocations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
\"resourceId\":\"$RESOURCE_ID\",
\"projectId\":\"$PROJECT_ID\",
\"unitsType\":\"PERCENT\",
\"allocationPercentage\":60,
\"type\":\"SOFT\",
\"startDate\":\"2026-02-01\",
\"endDate\":\"2026-02-28\"
}" | head -n 30

# Second SOFT allocation (50%), expect 200 or 201
curl -i -s -X POST "$BASE/api/resource-allocations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
\"resourceId\":\"$RESOURCE_ID\",
\"projectId\":\"$PROJECT_ID\",
\"unitsType\":\"PERCENT\",
\"allocationPercentage\":50,
\"type\":\"SOFT\",
\"startDate\":\"2026-02-01\",
\"endDate\":\"2026-02-28\"
}" | head -n 30

# Query conflicts endpoint
curl -s "$BASE/api/resources/conflicts?resourceId=$RESOURCE_ID&resolved=false" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Stop if:** Any 500.

#### 8d. Capacity Endpoint Responds

```bash
curl -s "$BASE/api/resources/capacity/resources?startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Stop if:** Any 500.

### Step 9: Write Release Log File

Fill in `docs/RELEASE_LOG_PHASE2.md` with results from all steps above.

---

## Pass Criteria

### Step 1: Local Repo Sanity
- ✅ Working tree is clean (no uncommitted changes)
- ✅ Branch is `main`
- ✅ `LOCAL_SHA` (full) and `LOCAL_SHORT` (7 chars) captured

### Step 2: Railway CLI Access
- ✅ Railway CLI installed (`railway --version` works)
- ✅ Logged in (`railway status` shows logged in)
- ✅ Project linked (`railway link` succeeds or already linked)
- ✅ Service name confirmed: `zephix-backend`

### Step 3: Pre-Deploy Proof
- ✅ `/api/version` endpoint responds
- ✅ Response includes `commitSha` and `commitShaTrusted` fields
- ✅ `commitShaTrusted` is `true` in production (indicates Railway set RAILWAY_GIT_COMMIT_SHA)

### Step 4: Deploy Latest Main
- ✅ Deployment shows **Success** status
- ✅ Deployment is **Active**

### Step 5: Post-Deploy Proof
- ✅ `/api/version` returns `commitSha` and `commitShaTrusted` fields
- ✅ `PROD_SHORT` equals `LOCAL_SHORT` (first 7 characters match)

### Step 6: Migration
- ✅ Migration command executes without errors
- ✅ Output shows "Migration Phase2ResourceSchemaUpdates1786000000000 has been executed successfully" OR "No migrations are pending"

### Step 7: Schema Verification
- ✅ `resources.workspace_id` exists and `is_nullable = 'YES'`
- ✅ `resource_allocations.organization_id` exists and `is_nullable = 'NO'`
- ✅ `resource_allocations.units_type` exists (type: `units_type_enum`)
- ✅ `resource_conflicts.organization_id` exists and `is_nullable = 'NO'`
- ✅ Phase 2 migration appears in migrations list (name contains "Phase2ResourceSchemaUpdates")

### Step 8: Smoke Tests

**8a. Create Resource:**
- ✅ `RESOURCE_ID` is non-empty (not null, not empty string)
- ✅ HTTP status is 200 or 201

**8b. HARD Overallocation:**
- ✅ First HARD allocation (60%) succeeds (201)
- ✅ Second HARD allocation (50%) returns **HTTP 409 Conflict**
- ✅ Error message mentions exceeding 100% capacity

**8c. SOFT Overallocation:**
- ✅ First SOFT allocation (60%) succeeds (201)
- ✅ Second SOFT allocation (50%) returns **200 or 201** (NOT 409)
- ✅ Conflicts endpoint returns HTTP 200
- ✅ Conflicts list contains at least one unresolved conflict for this resource
- ✅ Conflict row has `totalAllocation > 100`
- ✅ Conflict row has `resolved = false`

**8d. Capacity Endpoint:**
- ✅ HTTP status is 200
- ✅ Response includes `data` array
- ✅ At least one resource entry with `weeks` array
- ✅ Week entry includes: `weekStart`, `weekEnd`, `totalHard`, `totalSoft`, `total`, `remaining`

---

## Stop Conditions

**STOP IMMEDIATELY if any of the following occur:**

1. **Step 4: Deployment Failure**
   - Deployment fails or never becomes Active
   - **Action:** Check Railway logs, investigate deployment failure

2. **Step 5: SHA Mismatch**
   - `commitSha` missing from `/api/version` response after redeploy
   - `commitShaTrusted` is `false` in production (Railway not setting RAILWAY_GIT_COMMIT_SHA)
   - `PROD_SHORT` does not equal `LOCAL_SHORT` after redeploy
   - **Action:** Investigate deployment, check Railway logs, redeploy if needed

3. **Step 6: Migration Error**
   - Migration command returns error
   - Migration does not complete successfully
   - **Action:** Do not proceed with smoke tests. Investigate migration error.

4. **Step 7: Schema Verification Failure**
   - Any required column is missing
   - Any required column has wrong nullability
   - Migration row missing from `migrations` table
   - **Action:** Investigate migration execution, check Railway logs

5. **Step 8a: Resource Creation Failure**
   - Any 500 error during resource creation
   - **Action:** Stop immediately. Check Railway logs.

6. **Step 8b: HARD Test Failure**
   - Second HARD allocation does not return HTTP 409
   - Returns 500 or other unexpected error
   - **Action:** Stop deployment. Investigate conflict enforcement logic.

7. **Step 8c: SOFT Test Failure**
   - Any 500 error during SOFT allocation or conflicts query
   - **Action:** Stop immediately. Check Railway logs.

8. **Step 8d: Capacity Endpoint Failure**
   - Any 500 error
   - **Action:** Stop immediately. Check Railway logs.

9. **Authentication Failure**
   - All requests return 401 Unauthorized
   - **Action:** Verify token is valid and not expired

---

## Release Log Template

See `docs/RELEASE_LOG_PHASE2.md` for the template. Fill it in with:
- Date/time
- LOCAL_SHA (full and short)
- PreDeploy commitSha and commitShaTrusted
- PostDeploy commitSha and commitShaTrusted
- Migration output summary
- Schema verification results
- Smoke test outcomes with HTTP codes
- Final status: Success or Failed
- If failed, where it stopped and why

---

## Automated Verification Script

For faster verification, use the automated script:

```bash
# Set required environment variables
export TOKEN="your-auth-token"
export ORG_ID="your-org-id"
export PROJECT_ID="your-project-id"

# Run verification
./scripts/phase2-deploy-verify.sh
```

The script will:
- ✅ Verify commit SHA match
- ✅ Run migration
- ✅ Verify schema changes
- ✅ Run all smoke tests
- ✅ Exit with clear pass/fail status

**Exit codes:**
- `0` - All checks passed
- `1` - Pre-deploy check failed
- `2` - Migration failed
- `3` - Schema verification failed
- `4` - Smoke test failed

---

## Rollback Plan

If deployment fails, see `docs/PHASE2_ROLLBACK_PLAN.md` for detailed rollback instructions.

**Quick rollback:**
```bash
# Revert migration
railway run --service zephix-backend -- sh -lc "cd zephix-backend && npm run migration:revert"

# Redeploy previous commit via Railway Dashboard
```

---

**End of Deployment Guide**

