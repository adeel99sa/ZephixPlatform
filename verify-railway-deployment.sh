#!/bin/bash

# Railway Deployment Verification Script
# Run this after making Railway configuration changes

set -e

BACKEND_URL="https://zephix-backend-production.up.railway.app"
EXPECTED_COMMIT="3469a56"

echo "🔍 Railway Deployment Verification"
echo "===================================="
echo ""

# Step 1: Check version endpoint for commitSha
echo "Step 1: Checking /api/version for commitSha..."
VERSION_RESPONSE=$(curl -s "${BACKEND_URL}/api/version")
COMMIT_SHA=$(echo "$VERSION_RESPONSE" | jq -r '.commitSha // .data.commitSha // empty')

if [ -z "$COMMIT_SHA" ] || [ "$COMMIT_SHA" = "null" ] || [ "$COMMIT_SHA" = "unknown" ]; then
  echo "❌ FAIL: commitSha is missing or unknown"
  echo ""
  echo "Full response:"
  echo "$VERSION_RESPONSE" | jq .
  echo ""
  echo "🔧 Action Required:"
  echo "1. Verify Railway Dashboard → zephix-backend → Settings:"
  echo "   - Source Repo points to correct GitHub repo"
  echo "   - Branch is set to 'main'"
  echo "   - Root Directory is set to 'zephix-backend'"
  echo "2. Redeploy from latest main commit"
  echo "3. Restart service after deploy"
  echo ""
  exit 1
fi

echo "✅ commitSha found: $COMMIT_SHA"
echo ""

# Compare commit SHA (basic check - newer commits will have different SHA)
if [ "$COMMIT_SHA" = "$EXPECTED_COMMIT" ]; then
  echo "✅ commitSha matches expected: $EXPECTED_COMMIT"
elif [ ${#COMMIT_SHA} -ge 7 ]; then
  echo "⚠️  commitSha is present but different: $COMMIT_SHA"
  echo "   (Expected: $EXPECTED_COMMIT or newer)"
  echo "   This may be a newer commit, which is acceptable."
else
  echo "⚠️  commitSha format unexpected: $COMMIT_SHA"
  echo "   Expected: 7+ character hex string"
fi

echo ""
echo "Step 2: Running 2-step smoke test..."
echo ""

# Generate unique test variables
ORG="Smoke Org $(date +%s)"
EMAIL1="smoke-a-$(date +%s)@example.com"
EMAIL2="smoke-b-$(date +%s)@example.com"

echo "Test variables:"
echo "  ORG: $ORG"
echo "  EMAIL1: $EMAIL1"
echo "  EMAIL2: $EMAIL2"
echo ""

# Test 1: New org, new email
echo "=== Test 1: New org, new email (Expected: HTTP 200) ==="
TEST1_RESPONSE=$(curl -i -s -X POST "${BACKEND_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL1}\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"${ORG}\"}")

TEST1_STATUS=$(echo "$TEST1_RESPONSE" | head -n 1 | grep -oP 'HTTP/\d\.\d \K\d+' || echo "unknown")
TEST1_REQUEST_ID=$(echo "$TEST1_RESPONSE" | grep -i 'x-request-id:' | head -n 1 | cut -d' ' -f2 | tr -d '\r' || echo "unknown")

echo "Status: HTTP $TEST1_STATUS"
echo "RequestId: $TEST1_REQUEST_ID"
echo ""

if [ "$TEST1_STATUS" = "200" ]; then
  echo "✅ Test 1: PASS (HTTP 200)"
else
  echo "❌ Test 1: FAIL (Expected HTTP 200, got HTTP $TEST1_STATUS)"
  echo ""
  echo "Full response:"
  echo "$TEST1_RESPONSE" | head -n 40
  exit 1
fi

# Wait a moment between tests
sleep 2

# Test 2: Same orgName, different email
echo "=== Test 2: Same orgName, different email (Expected: HTTP 409) ==="
TEST2_RESPONSE=$(curl -i -s -X POST "${BACKEND_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL2}\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"${ORG}\"}")

TEST2_STATUS=$(echo "$TEST2_RESPONSE" | head -n 1 | grep -oP 'HTTP/\d\.\d \K\d+' || echo "unknown")
TEST2_REQUEST_ID=$(echo "$TEST2_RESPONSE" | grep -i 'x-request-id:' | head -n 1 | cut -d' ' -f2 | tr -d '\r' || echo "unknown")

echo "Status: HTTP $TEST2_STATUS"
echo "RequestId: $TEST2_REQUEST_ID"
echo ""

if [ "$TEST2_STATUS" = "409" ]; then
  echo "✅ Test 2: PASS (HTTP 409 Conflict)"
  echo ""
  echo "Response body:"
  echo "$TEST2_RESPONSE" | tail -n +20 | head -n 10
elif [ "$TEST2_STATUS" = "500" ]; then
  echo "❌ Test 2: FAIL (Got HTTP 500, expected HTTP 409)"
  echo ""
  echo "This indicates the org slug handler is not working."
  echo "The new code (commit $COMMIT_SHA) may not be handling org slug duplicates correctly."
  echo ""
  echo "Full response:"
  echo "$TEST2_RESPONSE" | head -n 60
  echo ""
  echo "🔧 Debug Steps:"
  echo "1. Check Railway logs for requestId: $TEST2_REQUEST_ID"
  echo "2. Search for '[ORG_SLUG_HANDLER]' in logs"
  echo "3. Verify error handling logic in auth-registration.service.ts"
  exit 1
else
  echo "⚠️  Test 2: Unexpected status (Expected HTTP 409, got HTTP $TEST2_STATUS)"
  echo ""
  echo "Full response:"
  echo "$TEST2_RESPONSE" | head -n 60
  exit 1
fi

echo ""
echo "===================================="
echo "✅ All verification steps passed!"
echo ""
echo "Summary:"
echo "  - commitSha: $COMMIT_SHA"
echo "  - Test 1: HTTP 200 ✅"
echo "  - Test 2: HTTP 409 ✅"
echo ""
echo "Deployment is verified. You can return to development."

