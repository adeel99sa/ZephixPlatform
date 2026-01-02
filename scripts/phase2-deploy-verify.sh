#!/usr/bin/env bash
# Phase 2 Deployment Verification Script
#
# Usage:
#   export TOKEN="your-auth-token"
#   export ORG_ID="your-org-id"
#   export PROJECT_ID="your-project-id"
#   export WORKSPACE_ID="your-workspace-id"
#   ./scripts/phase2-deploy-verify.sh
#
# This script verifies Phase 2 deployment by:
# 1. Reading local git SHA
# 2. Checking production /api/version commitSha
# 3. Running migration in Railway environment
# 4. Verifying schema changes in Postgres
# 5. Running smoke tests for resource allocation conflicts
#
# Exit codes:
#   0 - All checks passed
#   1 - Pre-deploy check failed
#   2 - Migration failed
#   3 - Schema verification failed
#   4 - Smoke test failed

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="https://zephix-backend-production.up.railway.app"
SERVICE_NAME="zephix-backend"

# Check required environment variables
if [ -z "${TOKEN:-}" ]; then
  echo -e "${RED}❌ ERROR: TOKEN environment variable is required${NC}"
  echo "   export TOKEN=\"your-auth-token\""
  exit 1
fi

if [ -z "${ORG_ID:-}" ]; then
  echo -e "${RED}❌ ERROR: ORG_ID environment variable is required${NC}"
  echo "   export ORG_ID=\"your-org-id\""
  exit 1
fi

if [ -z "${PROJECT_ID:-}" ]; then
  echo -e "${RED}❌ ERROR: PROJECT_ID environment variable is required${NC}"
  echo "   export PROJECT_ID=\"your-project-id\""
  exit 1
fi

if [ -z "${WORKSPACE_ID:-}" ]; then
  echo -e "${RED}❌ ERROR: WORKSPACE_ID environment variable is required${NC}"
  echo "   export WORKSPACE_ID=\"your-workspace-id\""
  echo ""
  echo "   To get WORKSPACE_ID, run:"
  echo "   curl -s \"$BASE_URL/api/workspaces\" -H \"Authorization: Bearer \$TOKEN\" | jq -r '.data[0].id'"
  exit 2
fi

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ ERROR: jq is required but not installed${NC}"
  exit 1
fi

if ! command -v railway &> /dev/null; then
  echo -e "${RED}❌ ERROR: Railway CLI is required but not installed${NC}"
  exit 1
fi

echo -e "${GREEN}🚀 Phase 2 Deployment Verification${NC}"
echo "=================================="
echo ""

# Step 1: Read local git SHA
echo -e "${YELLOW}Step 1: Reading local git SHA...${NC}"
cd "$(dirname "$0")/../zephix-backend" || exit 1
LOCAL_SHA=$(git rev-parse HEAD)
LOCAL_SHORT=$(echo "$LOCAL_SHA" | cut -c1-7)
echo "Local SHA (full): $LOCAL_SHA"
echo "Local SHA (short): $LOCAL_SHORT"
echo ""

# Step 2: Check production /api/version
echo -e "${YELLOW}Step 2: Checking production /api/version...${NC}"
VERSION_RESPONSE=$(curl -s "$BASE_URL/api/version")
PROD_SHA=$(echo "$VERSION_RESPONSE" | jq -r '.data.commitSha // empty')
PROD_SHORT=$(echo "$PROD_SHA" | cut -c1-7 2>/dev/null || echo "")

if [ -z "$PROD_SHA" ]; then
  echo -e "${RED}❌ ERROR: commitSha not found in /api/version response${NC}"
  echo "Response: $VERSION_RESPONSE"
  exit 1
fi

echo "Production SHA (full): $PROD_SHA"
echo "Production SHA (short): $PROD_SHORT"
echo ""

if [ "$PROD_SHA" = "unknown" ]; then
  echo -e "${YELLOW}⚠️  WARNING: commitSha is 'unknown' (Railway may not set RAILWAY_GIT_COMMIT_SHA)${NC}"
  echo "   Proceeding with verification assuming deployment is correct..."
  echo "   Local SHA: $LOCAL_SHORT"
  echo ""
elif [ "$LOCAL_SHORT" != "$PROD_SHORT" ]; then
  echo -e "${RED}❌ ERROR: SHA mismatch!${NC}"
  echo "   Local:  $LOCAL_SHORT"
  echo "   Prod:   $PROD_SHORT"
  echo ""
  echo "Please deploy latest main to Railway first."
  exit 1
else
  echo -e "${GREEN}✅ SHA matches${NC}"
  echo ""
fi

# Step 3: Run migration
echo -e "${YELLOW}Step 3: Running migration in Railway environment...${NC}"
MIGRATION_OUTPUT=$(railway run --service "$SERVICE_NAME" -- sh -lc "cd zephix-backend && npm run migration:run" 2>&1) || {
  echo -e "${RED}❌ ERROR: Migration failed${NC}"
  echo "$MIGRATION_OUTPUT"
  exit 2
}

echo "$MIGRATION_OUTPUT"
if echo "$MIGRATION_OUTPUT" | grep -q "executed successfully\|No migrations are pending"; then
  echo -e "${GREEN}✅ Migration completed${NC}"
else
  echo -e "${YELLOW}⚠️  Migration output unclear, but no error${NC}"
fi
echo ""

# Step 4: Verify schema
echo -e "${YELLOW}Step 4: Verifying schema changes...${NC}"

# Check migration was recorded
echo "Checking migration record..."
MIGRATION_CHECK=$(railway run --service "$SERVICE_NAME" -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id,name,timestamp FROM migrations ORDER BY id DESC LIMIT 20;"' 2>&1) || {
  echo -e "${RED}❌ ERROR: Failed to query migrations table${NC}"
  exit 3
}

if ! echo "$MIGRATION_CHECK" | grep -q "Phase2ResourceSchemaUpdates"; then
  echo -e "${RED}❌ ERROR: Phase 2 migration not found in migrations table${NC}"
  echo "$MIGRATION_CHECK"
  exit 3
fi
echo -e "${GREEN}✅ Migration recorded${NC}"

# Check resources.workspace_id
echo "Checking resources.workspace_id..."
WORKSPACE_ID_CHECK=$(railway run --service "$SERVICE_NAME" -- sh -lc 'psql "$DATABASE_URL" -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_name = '\''resources'\'' AND column_name = '\''workspace_id'\'';"' 2>&1) || {
  echo -e "${RED}❌ ERROR: Failed to query resources table${NC}"
  exit 3
}

if ! echo "$WORKSPACE_ID_CHECK" | grep -q "workspace_id.*YES"; then
  echo -e "${RED}❌ ERROR: resources.workspace_id missing or not nullable${NC}"
  echo "$WORKSPACE_ID_CHECK"
  exit 3
fi
echo -e "${GREEN}✅ resources.workspace_id exists (nullable)${NC}"

# Check resource_allocations.organization_id and units_type
echo "Checking resource_allocations columns..."
ALLOCATIONS_CHECK=$(railway run --service "$SERVICE_NAME" -- sh -lc 'psql "$DATABASE_URL" -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_name = '\''resource_allocations'\'' AND column_name IN ('\''organization_id'\'','\''units_type'\'') ORDER BY column_name;"' 2>&1) || {
  echo -e "${RED}❌ ERROR: Failed to query resource_allocations table${NC}"
  exit 3
}

if ! echo "$ALLOCATIONS_CHECK" | grep -q "organization_id.*NO"; then
  echo -e "${RED}❌ ERROR: resource_allocations.organization_id missing or nullable${NC}"
  echo "$ALLOCATIONS_CHECK"
  exit 3
fi

if ! echo "$ALLOCATIONS_CHECK" | grep -q "units_type"; then
  echo -e "${RED}❌ ERROR: resource_allocations.units_type missing${NC}"
  echo "$ALLOCATIONS_CHECK"
  exit 3
fi
echo -e "${GREEN}✅ resource_allocations.organization_id exists (NOT NULL)${NC}"
echo -e "${GREEN}✅ resource_allocations.units_type exists${NC}"

# Check resource_conflicts.organization_id
echo "Checking resource_conflicts.organization_id..."
CONFLICTS_CHECK=$(railway run --service "$SERVICE_NAME" -- sh -lc 'psql "$DATABASE_URL" -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_name = '\''resource_conflicts'\'' AND column_name = '\''organization_id'\'';"' 2>&1) || {
  echo -e "${RED}❌ ERROR: Failed to query resource_conflicts table${NC}"
  exit 3
}

if ! echo "$CONFLICTS_CHECK" | grep -q "organization_id.*NO"; then
  echo -e "${RED}❌ ERROR: resource_conflicts.organization_id missing or nullable${NC}"
  echo "$CONFLICTS_CHECK"
  exit 3
fi
echo -e "${GREEN}✅ resource_conflicts.organization_id exists (NOT NULL)${NC}"
echo ""

# Step 5: Smoke tests
echo -e "${YELLOW}Step 5: Running smoke tests...${NC}"

# 5a. Create resource
echo "5a. Creating test resource..."
RESOURCE_NAME="Smoke Resource $(date +%s)"
RESOURCE_EMAIL="smoke-resource-$(date +%s)@example.com"

RESOURCE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$RESOURCE_NAME\",\"email\":\"$RESOURCE_EMAIL\",\"role\":\"Developer\",\"organizationId\":\"$ORG_ID\"}")

RESOURCE_ID=$(echo "$RESOURCE_RESPONSE" | jq -r '.data.id // empty')
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$RESOURCE_NAME\",\"email\":\"$RESOURCE_EMAIL\",\"role\":\"Developer\",\"organizationId\":\"$ORG_ID\"}")

if [ -z "$RESOURCE_ID" ] || [ "$RESOURCE_ID" = "null" ]; then
  echo -e "${RED}❌ ERROR: Failed to create resource${NC}"
  echo "Response: $RESOURCE_RESPONSE"
  exit 4
fi

if [ "$HTTP_STATUS" -ge 500 ]; then
  echo -e "${RED}❌ ERROR: Server error (HTTP $HTTP_STATUS)${NC}"
  exit 4
fi

echo "Resource ID: $RESOURCE_ID"
echo -e "${GREEN}✅ Resource created${NC}"

# 5b. HARD overallocation should block with 409
echo ""
echo "5b. Testing HARD overallocation block..."
# First allocation (60%)
FIRST_HARD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/resource-allocations" \
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
}")

FIRST_HARD_STATUS=$(echo "$FIRST_HARD_RESPONSE" | tail -n1)
if [ "$FIRST_HARD_STATUS" -lt 200 ] || [ "$FIRST_HARD_STATUS" -ge 300 ]; then
  echo -e "${RED}❌ ERROR: First HARD allocation failed (HTTP $FIRST_HARD_STATUS)${NC}"
  exit 4
fi
echo -e "${GREEN}✅ First HARD allocation created (HTTP $FIRST_HARD_STATUS)${NC}"

# Second allocation (50%), should return 409
SECOND_HARD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/resource-allocations" \
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
}")

SECOND_HARD_STATUS=$(echo "$SECOND_HARD_RESPONSE" | tail -n1)
if [ "$SECOND_HARD_STATUS" != "409" ]; then
  echo -e "${RED}❌ ERROR: Second HARD allocation should return 409, got $SECOND_HARD_STATUS${NC}"
  echo "Response: $(echo "$SECOND_HARD_RESPONSE" | head -n -1)"
  exit 4
fi
echo -e "${GREEN}✅ Second HARD allocation blocked with 409${NC}"

# 5c. SOFT overallocation should succeed and create conflict
echo ""
echo "5c. Testing SOFT overallocation and conflict creation..."
# First SOFT allocation (60%)
FIRST_SOFT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/resource-allocations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
\"resourceId\":\"$RESOURCE_ID\",
\"projectId\":\"$PROJECT_ID\",
\"unitsType\":\"PERCENT\",
\"allocationPercentage\":60,
\"type\":\"SOFT\",
\"startDate\":\"2026-02-01\",
\"endDate\":\"2026-02-28\",
\"justification\":\"Phase 2 smoke test - first SOFT allocation\"
}")

FIRST_SOFT_STATUS=$(echo "$FIRST_SOFT_RESPONSE" | tail -n1)
if [ "$FIRST_SOFT_STATUS" -lt 200 ] || [ "$FIRST_SOFT_STATUS" -ge 300 ]; then
  echo -e "${RED}❌ ERROR: First SOFT allocation failed (HTTP $FIRST_SOFT_STATUS)${NC}"
  exit 4
fi
echo -e "${GREEN}✅ First SOFT allocation created (HTTP $FIRST_SOFT_STATUS)${NC}"

# Second SOFT allocation (50%), should succeed (total will be 110%, requires justification)
SECOND_SOFT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/resource-allocations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
\"resourceId\":\"$RESOURCE_ID\",
\"projectId\":\"$PROJECT_ID\",
\"unitsType\":\"PERCENT\",
\"allocationPercentage\":50,
\"type\":\"SOFT\",
\"startDate\":\"2026-02-01\",
\"endDate\":\"2026-02-28\",
\"justification\":\"Phase 2 smoke test - second SOFT allocation creating conflict\"
}")

SECOND_SOFT_STATUS=$(echo "$SECOND_SOFT_RESPONSE" | tail -n1)
if [ "$SECOND_SOFT_STATUS" -ge 500 ]; then
  echo -e "${RED}❌ ERROR: Server error on second SOFT allocation (HTTP $SECOND_SOFT_STATUS)${NC}"
  exit 4
fi

if [ "$SECOND_SOFT_STATUS" = "409" ]; then
  echo -e "${RED}❌ ERROR: Second SOFT allocation should not return 409, got $SECOND_SOFT_STATUS${NC}"
  exit 4
fi
echo -e "${GREEN}✅ Second SOFT allocation succeeded (HTTP $SECOND_SOFT_STATUS)${NC}"

# Wait a moment for conflict creation
sleep 2

# Query conflicts (with workspaceId)
echo "Querying conflicts..."
CONFLICTS_RESPONSE=$(curl -s "$BASE_URL/api/resources/conflicts?workspaceId=$WORKSPACE_ID&resourceId=$RESOURCE_ID&resolved=false" \
  -H "Authorization: Bearer $TOKEN")

CONFLICTS_COUNT=$(echo "$CONFLICTS_RESPONSE" | jq '.data | length')
if [ "$CONFLICTS_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ ERROR: No conflicts found for resource${NC}"
  echo "Response: $CONFLICTS_RESPONSE"
  exit 4
fi

TOTAL_OVER_100=$(echo "$CONFLICTS_RESPONSE" | jq '[.data[] | select(.totalAllocation > 100)] | length')
if [ "$TOTAL_OVER_100" -eq 0 ]; then
  echo -e "${RED}❌ ERROR: No conflicts with totalAllocation > 100${NC}"
  echo "Response: $CONFLICTS_RESPONSE"
  exit 4
fi

echo -e "${GREEN}✅ Conflicts found: $CONFLICTS_COUNT (with totalAllocation > 100: $TOTAL_OVER_100)${NC}"

# 5d. Capacity endpoint
echo ""
echo "5d. Testing capacity endpoint..."
CAPACITY_RESPONSE=$(curl -s "$BASE_URL/api/resources/capacity/resources?workspaceId=$WORKSPACE_ID&startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer $TOKEN")

CAPACITY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/resources/capacity/resources?workspaceId=$WORKSPACE_ID&startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer $TOKEN")

if [ "$CAPACITY_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Capacity endpoint returned HTTP $CAPACITY_STATUS${NC}"
  exit 4
fi

RESOURCES_COUNT=$(echo "$CAPACITY_RESPONSE" | jq '.data | length')
if [ "$RESOURCES_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No resources in capacity response (may be expected)${NC}"
else
  WEEKS_COUNT=$(echo "$CAPACITY_RESPONSE" | jq '.data[0].weeks | length')
  echo -e "${GREEN}✅ Capacity endpoint responded (HTTP $CAPACITY_STATUS)${NC}"
  echo "   Resources: $RESOURCES_COUNT, Weeks per resource: $WEEKS_COUNT"
fi

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}✅ All Phase 2 verification checks passed!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo "Summary:"
echo "  Local SHA:    $LOCAL_SHORT"
echo "  Production:   $PROD_SHORT"
echo "  Migration:    ✅ Applied"
echo "  Schema:       ✅ Verified"
echo "  HARD block:   ✅ 409 returned"
echo "  SOFT conflict: ✅ Created"
echo "  Capacity:     ✅ Responding"
echo ""

exit 0

