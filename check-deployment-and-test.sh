#!/bin/bash

# Script to check deployment and run org slug diagnostic test
# Usage: ./check-deployment-and-test.sh

set -e

BACKEND_URL="https://zephix-backend-production.up.railway.app"
EXPECTED_COMMIT="3469a56"

echo "🔍 Checking deployment status..."
echo ""

# Check version endpoint for commitSha
VERSION_RESPONSE=$(curl -s "${BACKEND_URL}/api/version")
COMMIT_SHA=$(echo "$VERSION_RESPONSE" | jq -r '.data.commitSha // .commitSha // empty')

if [ -z "$COMMIT_SHA" ] || [ "$COMMIT_SHA" = "null" ]; then
  echo "❌ Deployment not ready yet"
  echo "   commitSha is missing from /api/version"
  echo ""
  echo "📋 Full version response:"
  echo "$VERSION_RESPONSE" | jq .
  echo ""
  echo "⏳ Please redeploy on Railway and restart the service, then run this script again."
  exit 1
fi

echo "✅ Deployment confirmed!"
echo "   commitSha: $COMMIT_SHA"
echo ""

if [ "$COMMIT_SHA" != "$EXPECTED_COMMIT" ] && [[ ! "$COMMIT_SHA" =~ ^[0-9a-f]{7}$ ]]; then
  echo "⚠️  Warning: commitSha format unexpected: $COMMIT_SHA"
  echo "   Expected: $EXPECTED_COMMIT or newer commit"
  echo ""
fi

echo "🧪 Running org slug duplicate diagnostic test..."
echo ""

# Generate unique org name
ORG="Diag Org $(date +%s)"
echo "Using org name: $ORG"
echo ""

# First call - should succeed (200)
echo "=== FIRST CALL (should return 200) ==="
FIRST_EMAIL="diag-a-$(date +%s)@example.com"
FIRST_RESPONSE=$(curl -i -s -X POST "${BACKEND_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${FIRST_EMAIL}\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"${ORG}\"}")

FIRST_STATUS=$(echo "$FIRST_RESPONSE" | head -n 1 | grep -oP 'HTTP/\d\.\d \K\d+')
FIRST_REQUEST_ID=$(echo "$FIRST_RESPONSE" | grep -i 'x-request-id:' | cut -d' ' -f2 | tr -d '\r')

echo "$FIRST_RESPONSE" | head -n 30
echo ""

if [ "$FIRST_STATUS" = "200" ]; then
  echo "✅ First call: HTTP 200 (PASS)"
else
  echo "❌ First call: HTTP $FIRST_STATUS (FAIL - expected 200)"
fi

echo "RequestId: $FIRST_REQUEST_ID"
echo ""

# Wait a moment
sleep 2

# Second call - same org, different email - should return 409
echo "=== SECOND CALL (same org, different email - should return 409) ==="
SECOND_EMAIL="diag-b-$(date +%s)@example.com"
SECOND_RESPONSE=$(curl -i -s -X POST "${BACKEND_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SECOND_EMAIL}\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"${ORG}\"}")

SECOND_STATUS=$(echo "$SECOND_RESPONSE" | head -n 1 | grep -oP 'HTTP/\d\.\d \K\d+')
SECOND_REQUEST_ID=$(echo "$SECOND_RESPONSE" | grep -i 'x-request-id:' | cut -d' ' -f2 | tr -d '\r')

echo "$SECOND_RESPONSE" | head -n 30
echo ""

if [ "$SECOND_STATUS" = "409" ]; then
  echo "✅ Second call: HTTP 409 (PASS - handler is working!)"
elif [ "$SECOND_STATUS" = "500" ]; then
  echo "❌ Second call: HTTP 500 (FAIL - handler not working)"
  echo ""
  echo "🔍 Check Railway logs for requestId: $SECOND_REQUEST_ID"
  echo "   Search for: [ORG_SLUG_HANDLER]"
  echo "   Search for: Registration error caught"
else
  echo "⚠️  Second call: HTTP $SECOND_STATUS (UNEXPECTED - expected 409)"
fi

echo "RequestId: $SECOND_REQUEST_ID"
echo ""

# Summary
echo "=== TEST SUMMARY ==="
echo "Deployment: $COMMIT_SHA"
echo "First call:  HTTP $FIRST_STATUS"
echo "Second call: HTTP $SECOND_STATUS"
echo ""

if [ "$FIRST_STATUS" = "200" ] && [ "$SECOND_STATUS" = "409" ]; then
  echo "🎉 SUCCESS: Org slug handler is working correctly!"
  exit 0
elif [ "$SECOND_STATUS" = "500" ]; then
  echo "❌ FAILURE: Handler not working. Check logs for requestId: $SECOND_REQUEST_ID"
  echo ""
  echo "📋 Next steps:"
  echo "1. Go to Railway Dashboard → zephix-backend → Logs"
  echo "2. Search for requestId: $SECOND_REQUEST_ID"
  echo "3. Look for log lines:"
  echo "   - [ORG_SLUG_HANDLER]"
  echo "   - Registration error caught"
  echo "4. Capture these fields:"
  echo "   - error.name, error.code"
  echo "   - driverError.code, driverError.table, driverError.constraint, driverError.detail"
  echo "   - isOrgTable, isWorkspaceTable, mentionsSlug, mentionsName"
  echo "   - tableName, constraintName"
  exit 1
else
  echo "⚠️  UNEXPECTED: Second call returned HTTP $SECOND_STATUS (expected 409)"
  exit 1
fi

