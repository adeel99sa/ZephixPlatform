#!/bin/bash
# Complete verification script for tenancy fix
# Usage: PASSWORD="your-password" bash scripts/verify-tenancy-fix.sh

set -euo pipefail

export BASE="https://zephix-backend-production.up.railway.app"

echo "=== Step 1: Prove prod is running new commit ==="
COMMIT_SHA=$(curl -s "$BASE/api/version" | jq -r '.data.commitSha')
echo "Current SHA: $COMMIT_SHA"
echo "Expected prefix: 604da37"

if [[ ! "$COMMIT_SHA" =~ ^604da37 ]]; then
  echo "⚠️  WARNING: Commit SHA doesn't match expected prefix"
  echo "   Please set APP_COMMIT_SHA=604da37933c84415915fc8bb91972fabfbb3bea4 in Railway and redeploy"
  echo "   Or wait for auto-deploy to complete"
fi
echo ""

echo "=== Step 2: Get fresh token ==="
if [ -z "${PASSWORD:-}" ]; then
  echo "❌ ERROR: PASSWORD environment variable required"
  echo "Usage: PASSWORD=\"your-password\" bash scripts/verify-tenancy-fix.sh"
  exit 1
fi

TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"adeel99sa@yahoo.com\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ ERROR: Failed to get token"
  exit 1
fi

export TOKEN
echo "✅ Token obtained"
echo ""

echo "=== Step 3: Fetch IDs ==="
export ORG_ID=$(curl -s "$BASE/api/organizations" -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')
export WORKSPACE_ID=$(curl -s "$BASE/api/workspaces" -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')
export PROJECT_ID=$(curl -s "$BASE/api/projects" -H "Authorization: Bearer $TOKEN" -H "x-workspace-id: $WORKSPACE_ID" | jq -r '.data.items[0].id // .data.projects[0].id // .data[0].id')

echo "ORG_ID: $ORG_ID"
echo "WORKSPACE_ID: $WORKSPACE_ID"
echo "PROJECT_ID: $PROJECT_ID"
echo ""

if [ "$ORG_ID" = "null" ] || [ -z "$ORG_ID" ]; then
  echo "❌ ERROR: Failed to get ORG_ID"
  exit 1
fi

if [ "$WORKSPACE_ID" = "null" ] || [ -z "$WORKSPACE_ID" ]; then
  echo "❌ ERROR: Failed to get WORKSPACE_ID"
  exit 1
fi

if [ "$PROJECT_ID" = "null" ] || [ -z "$PROJECT_ID" ]; then
  echo "❌ ERROR: Failed to get PROJECT_ID"
  exit 1
fi

echo "=== Step 4: Re-run Phase 2 verifier ==="
bash scripts/run-phase2-verification.sh

echo ""
echo "=== Step 5: Quick single-call proof ==="
echo "Testing conflicts endpoint with x-workspace-id header..."
RESOURCE_ID=$(curl -s "$BASE/api/resources" -H "Authorization: Bearer $TOKEN" -H "x-workspace-id: $WORKSPACE_ID" | jq -r '.data[0].id // empty')

if [ -z "$RESOURCE_ID" ] || [ "$RESOURCE_ID" = "null" ]; then
  echo "⚠️  No resources found, using test resource ID from verifier output"
  echo "   (Check verifier output above for actual resource ID)"
else
  echo "Using resource ID: $RESOURCE_ID"
  curl -i -s "$BASE/api/resources/conflicts?resolved=false&resourceId=$RESOURCE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-workspace-id: $WORKSPACE_ID" | head -n 40
fi

