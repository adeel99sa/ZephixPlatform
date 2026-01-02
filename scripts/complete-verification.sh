#!/bin/bash
# Complete Phase 2 Verification Script
# Usage: PASSWORD="your-password" bash scripts/complete-verification.sh

set -euo pipefail

export BASE="https://zephix-backend-production.up.railway.app"

echo "=========================================="
echo "Phase 2 Complete Verification"
echo "=========================================="
echo ""

# Step 1: Prove prod is running new commit
echo "=== Step 1: Prove prod is running new commit ==="
COMMIT_SHA=$(curl -s "$BASE/api/version" | jq -r '.data.commitSha')
echo "Current SHA: $COMMIT_SHA"
echo "Expected prefix: 604da37"

if [[ ! "$COMMIT_SHA" =~ ^604da37 ]]; then
  echo "⚠️  WARNING: SHA mismatch - still showing old commit"
  echo "   Please set APP_COMMIT_SHA=604da37933c84415915fc8bb91972fabfbb3bea4 in Railway Variables"
  echo "   Then redeploy and re-run this script"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "✅ SHA matches expected prefix"
fi
echo ""

# Step 2: Get fresh token
echo "=== Step 2: Get fresh token ==="
if [ -z "${PASSWORD:-}" ]; then
  echo "❌ ERROR: PASSWORD environment variable required"
  echo "Usage: PASSWORD=\"your-password\" bash scripts/complete-verification.sh"
  exit 1
fi

TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"adeel99sa@yahoo.com\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ ERROR: Failed to get token - check password"
  exit 1
fi

export TOKEN
echo "✅ Token obtained"
echo ""

# Step 3: Fetch IDs
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

echo "✅ All IDs fetched successfully"
echo ""

# Step 4: Re-run Phase 2 verifier
echo "=== Step 4: Re-run Phase 2 verifier ==="
echo "Running: TOKEN=\"$TOKEN\" ORG_ID=\"$ORG_ID\" WORKSPACE_ID=\"$WORKSPACE_ID\" PROJECT_ID=\"$PROJECT_ID\" bash scripts/run-phase2-verification.sh"
echo ""

TOKEN="$TOKEN" ORG_ID="$ORG_ID" WORKSPACE_ID="$WORKSPACE_ID" PROJECT_ID="$PROJECT_ID" \
  bash scripts/run-phase2-verification.sh

VERIFIER_EXIT=$?

echo ""
echo "=== Step 5: Quick single-call proof for interceptor fix ==="

# Get a resource ID from the API
RESOURCE_ID=$(curl -s "$BASE/api/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  | jq -r '.data[0].id // empty')

if [ -z "$RESOURCE_ID" ] || [ "$RESOURCE_ID" = "null" ]; then
  echo "⚠️  No resources found via API, checking verifier output above for resource ID"
  echo "   You can manually test with:"
  echo "   curl -i -s \"$BASE/api/resources/conflicts?resolved=false&resourceId=<RESOURCE_ID>\" \\"
  echo "     -H \"Authorization: Bearer $TOKEN\" \\"
  echo "     -H \"x-workspace-id: $WORKSPACE_ID\" | head -n 40"
else
  echo "Testing conflicts endpoint with resource ID: $RESOURCE_ID"
  echo ""

  RESPONSE=$(curl -i -s "$BASE/api/resources/conflicts?resolved=false&resourceId=$RESOURCE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-workspace-id: $WORKSPACE_ID")

  HTTP_STATUS=$(echo "$RESPONSE" | head -n 1 | grep -oP '\d{3}')
  echo "$RESPONSE" | head -n 40

  echo ""
  echo "=== Pass Conditions Check ==="

  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ HTTP Status: 200"
  else
    echo "❌ HTTP Status: $HTTP_STATUS (expected 200)"
  fi

  if echo "$RESPONSE" | grep -q "invalid input syntax for type uuid: conflicts"; then
    echo "❌ Found UUID error (interceptor still broken)"
  else
    echo "✅ No UUID syntax errors"
  fi

  if echo "$RESPONSE" | grep -q "Failed to validate workspace access"; then
    echo "❌ Found workspace access error (interceptor still broken)"
  else
    echo "✅ No workspace access errors"
  fi
fi

echo ""
echo "=========================================="
if [ $VERIFIER_EXIT -eq 0 ]; then
  echo "✅ All verification steps completed"
else
  echo "⚠️  Verifier exited with code $VERIFIER_EXIT"
fi
echo "=========================================="

