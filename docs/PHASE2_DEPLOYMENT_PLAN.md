# Phase 2 Deployment Plan and Verification Steps

**Date:** 2026-02-01
**Service:** zephix-backend
**Platform:** Railway
**Objective:** Safely deploy Phase 2 Resource and Allocation Engine MVP changes

---

## Release Steps

- [ ] Step 1: Confirm local repo state
- [ ] Step 2: Confirm Railway CLI status and link
- [ ] Step 3: Pre-deploy proof and risk checks
- [ ] Step 4: Deploy latest main to Railway
- [ ] Step 5: Post-deploy proof
- [ ] Step 6: Run migration in Railway environment
- [ ] Step 7: Verify schema changes in Postgres
- [ ] Step 8: Run smoke tests
  - [ ] 8a. Create a resource
  - [ ] 8b. HARD overallocation should block with 409
  - [ ] 8c. SOFT overallocation should succeed and create conflict row
  - [ ] 8d. Capacity endpoint responds

---

## Commands

### Step 1: Confirm Local Repo State

```bash
cd /Users/malikadeel/Downloads/ZephixApp
git checkout main
git pull
git status
git rev-parse HEAD
```

**Expected output:** Clean working tree, latest commit SHA captured.

### Step 2: Confirm Railway CLI Status and Link

```bash
railway --version
railway status
railway link
```

**If not logged in:**
```bash
railway login
railway link
```

**Expected output:** Railway CLI installed, logged in, project linked.

### Step 3: Pre-Deploy Proof and Risk Checks

```bash
curl -s https://zephix-backend-production.up.railway.app/api/version | jq .
```

**Record:** Current commitSha value or note if missing.

### Step 4: Deploy Latest Main

**Option A: Railway Dashboard (Preferred)**
1. Go to Railway Dashboard
2. Select Zephix project
3. Select zephix-backend service
4. Go to Deployments tab
5. Click "Redeploy" on latest main commit
6. Wait until deployment shows "Success" and is "Active"

**Option B: Railway CLI (if available)**
```bash
railway up --service zephix-backend
```

### Step 5: Post-Deploy Proof

```bash
# Get local commit SHA
LOCAL_SHA=$(git rev-parse HEAD | cut -c1-7)
echo "Local SHA: $LOCAL_SHA"

# Check production version
curl -s https://zephix-backend-production.up.railway.app/api/version | jq .

# Verify commitSha matches
PROD_SHA=$(curl -s https://zephix-backend-production.up.railway.app/api/version | jq -r '.commitSha' | cut -c1-7)
echo "Production SHA: $PROD_SHA"

if [ "$LOCAL_SHA" = "$PROD_SHA" ]; then
  echo "✅ SHA matches"
else
  echo "❌ SHA mismatch - redeploy required"
fi
```

### Step 6: Run Migration in Railway Environment

```bash
railway run --service zephix-backend -- sh -lc "cd zephix-backend && npm run migration:run"
```

**Expected output:** Migration executed successfully or "No migrations are pending".

### Step 7: Verify Schema Changes in Postgres

```bash
# Check migration was recorded
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT name, timestamp FROM migrations ORDER BY id DESC LIMIT 10;"'

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
AND column_name IN ('\''organization_id'\'','\''units_type'\'');"'

# Verify resource_conflicts.organization_id
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '\''resource_conflicts'\''
AND column_name IN ('\''organization_id'\'');"'
```

### Step 8: Smoke Tests

**Set variables (replace placeholders):**
```bash
export BASE="https://zephix-backend-production.up.railway.app"
export TOKEN="PASTE_TOKEN_HERE"
export ORG_ID="PASTE_ORG_ID_HERE"
export PROJECT_ID="PASTE_PROJECT_ID_HERE"
```

**8a. Create a resource:**
```bash
RESOURCE_NAME="Smoke Resource $(date +%s)"
RESOURCE_EMAIL="smoke-resource-$(date +%s)@example.com"

RESOURCE_ID=$(curl -s -X POST "$BASE/api/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$RESOURCE_NAME\",\"email\":\"$RESOURCE_EMAIL\",\"role\":\"Developer\",\"organizationId\":\"$ORG_ID\"}" | jq -r '.data.id')

echo "Resource ID: $RESOURCE_ID"
```

**8b. HARD overallocation should block with 409:**
```bash
# Create first HARD allocation 60%
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

# Create second HARD allocation 50%, same window, expect 409
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

**8c. SOFT overallocation should succeed and create conflict row:**
```bash
# Create first SOFT allocation 60%
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

# Create second SOFT allocation 50%, same window, expect 200 or 201
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

**8d. Capacity endpoint responds:**
```bash
curl -s "$BASE/api/resources/capacity/resources?startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Pass Criteria

### Step 1: Local Repo State
- ✅ Working tree is clean
- ✅ Branch is `main`
- ✅ Latest commit SHA captured

### Step 2: Railway CLI
- ✅ Railway CLI installed and accessible
- ✅ Logged in to Railway
- ✅ Project linked to current directory

### Step 3: Pre-Deploy Proof
- ✅ `/api/version` endpoint responds
- ✅ `commitSha` field present in response (or note if missing)

### Step 4: Deploy
- ✅ Deployment shows "Success" status
- ✅ Deployment is "Active"

### Step 5: Post-Deploy Proof
- ✅ `/api/version` returns `commitSha`
- ✅ `commitSha` starts with local main commit SHA (first 7 characters match)

### Step 6: Migration
- ✅ Migration command executes without errors
- ✅ Output shows "Migration Phase2ResourceSchemaUpdates1786000000000 has been executed successfully" OR "No migrations are pending"

### Step 7: Schema Verification
- ✅ `resources.workspace_id` exists and `is_nullable = 'YES'`
- ✅ `resource_allocations.organization_id` exists and `is_nullable = 'NO'`
- ✅ `resource_allocations.units_type` exists (type: `units_type_enum`)
- ✅ `resource_conflicts.organization_id` exists and `is_nullable = 'NO'`
- ✅ Migration row exists in `migrations` table with name containing "Phase2ResourceSchemaUpdates"

### Step 8: Smoke Tests

**8a. Create Resource:**
- ✅ `RESOURCE_ID` is not null and not empty
- ✅ HTTP status is 200 or 201

**8b. HARD Overallocation:**
- ✅ First HARD allocation (60%) succeeds (201)
- ✅ Second HARD allocation (50%) returns HTTP 409 Conflict
- ✅ Error message mentions exceeding 100% capacity

**8c. SOFT Overallocation:**
- ✅ First SOFT allocation (60%) succeeds (201)
- ✅ Second SOFT allocation (50%) succeeds (200 or 201, NOT 409)
- ✅ Conflicts endpoint returns at least one row for the resource
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

1. **Post-Deploy Proof Failure:**
   - `/api/version` `commitSha` does not match local main SHA after redeploy
   - Action: Investigate deployment, check Railway logs, redeploy if needed

2. **Migration Failure:**
   - Migration command returns error
   - Migration does not appear in `migrations` table
   - Action: Do not proceed with smoke tests. Rollback if necessary.

3. **Schema Verification Failure:**
   - Any required column is missing
   - Any required column has wrong nullability
   - Migration row missing from `migrations` table
   - Action: Investigate migration execution, check Railway logs

4. **HARD Test Failure:**
   - Second HARD allocation does not return HTTP 409
   - Returns 500 or other unexpected error
   - Action: Stop deployment. Investigate conflict enforcement logic.

5. **Any 500 Error:**
   - Any smoke test endpoint returns HTTP 500
   - Action: Stop immediately. Check Railway logs. Do not proceed.

6. **Authentication Failure:**
   - All requests return 401 Unauthorized
   - Action: Verify token is valid and not expired

---

## Release Log Template

```markdown
# Phase 2 Release Log

**Date:** YYYY-MM-DD HH:MM:SS UTC
**Deployed by:** [Your Name]
**Service:** zephix-backend
**Platform:** Railway

## Pre-Deploy State

**Local Commit SHA:** `[full SHA]`
**Pre-Deploy Production SHA:** `[SHA from /api/version or "missing"]`
**Pre-Deploy Status:** [Match/Mismatch/Missing]

## Deployment

**Deployment Method:** [Dashboard Redeploy / CLI]
**Deployment Time:** [timestamp]
**Deployment Status:** [Success/Failed]
**Post-Deploy Production SHA:** `[SHA from /api/version]`
**SHA Match:** [✅ Match / ❌ Mismatch]

## Migration

**Migration Command:** `railway run --service zephix-backend -- sh -lc "cd zephix-backend && npm run migration:run"`
**Migration Status:** [Success / Failed / No Pending]
**Migration Output:**
\`\`\`
[paste migration output]
\`\`\`

**Migration Verification:**
- [ ] Migration row exists in migrations table
- [ ] resources.workspace_id exists (nullable)
- [ ] resource_allocations.organization_id exists (NOT NULL)
- [ ] resource_allocations.units_type exists
- [ ] resource_conflicts.organization_id exists (NOT NULL)

## Smoke Tests

### Test 8a: Create Resource
**Request:**
\`\`\`
POST /api/resources
\`\`\`

**Response Status:** [200/201/4xx/5xx]
**Resource ID:** `[UUID or null]`
**Result:** [✅ Pass / ❌ Fail]

### Test 8b: HARD Overallocation Block
**Request 1 (60%):**
- Status: [201/4xx/5xx]
- Result: [✅ Pass / ❌ Fail]

**Request 2 (50%, expect 409):**
- Status: [409/4xx/5xx]
- Result: [✅ Pass / ❌ Fail]

### Test 8c: SOFT Overallocation + Conflict Creation
**Request 1 (60%):**
- Status: [201/4xx/5xx]
- Result: [✅ Pass / ❌ Fail]

**Request 2 (50%, expect 200/201):**
- Status: [200/201/4xx/5xx]
- Result: [✅ Pass / ❌ Fail]

**Conflicts Query:**
- Status: [200/4xx/5xx]
- Conflict Rows Found: [count]
- Total Allocation > 100: [✅ Yes / ❌ No]
- Result: [✅ Pass / ❌ Fail]

### Test 8d: Capacity Endpoint
**Request:**
\`\`\`
GET /api/resources/capacity/resources?startDate=2026-02-01&endDate=2026-02-28
\`\`\`

**Response Status:** [200/4xx/5xx]
**Resources Returned:** [count]
**Weeks Data Present:** [✅ Yes / ❌ No]
**Result:** [✅ Pass / ❌ Fail]

## Issues and Resolution

**Issue 1:** [Description]
**Resolution:** [What was done]
**Status:** [Resolved / Pending / Rolled Back]

## Final Status

**Overall Result:** [✅ Success / ❌ Failed / ⚠️ Partial]
**Production Ready:** [✅ Yes / ❌ No]
**Rollback Required:** [✅ Yes / ❌ No]

**Notes:**
[Any additional observations or concerns]
```

---

## Quick Reference

### Get Auth Token
If you need to obtain a production auth token:
1. Login to production frontend
2. Open browser DevTools → Application/Storage → Local Storage
3. Find `authToken` or `accessToken` key
4. Copy the value

### Get Org ID and Project ID
```bash
# List organizations (requires token)
curl -s "$BASE/api/organizations" \
  -H "Authorization: Bearer $TOKEN" | jq .

# List projects (requires token and org context)
curl -s "$BASE/api/projects" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Railway Logs
```bash
railway logs --service zephix-backend
```

### Check Deployment Status
```bash
railway status --service zephix-backend
```

---

**End of Deployment Plan**

