#!/bin/bash
# Contract check for POST /api/projects endpoint

set -e

BASE_URL=${BASE_URL:-http://localhost:3000}

echo "🔍 Contract check: POST /api/projects"

# Get auth token first
echo "Getting auth token..."
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@zephix.ai","password":"demo123456"}')

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Got auth token"

# Test 1: Missing workspaceId should return 400
echo "Testing missing workspaceId..."
RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/projects" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Project"}' || echo "000")

HTTP_CODE="${RESPONSE: -3}"
BODY="${RESPONSE%???}"

if [ "$HTTP_CODE" != "400" ]; then
  echo "❌ Expected 400, got $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi

# Check error message contains workspaceId
if ! echo "$BODY" | grep -q "workspaceId"; then
  echo "❌ Error message should mention workspaceId"
  echo "Response: $BODY"
  exit 1
fi

echo "✅ Contract check passed: Missing workspaceId returns 400 with correct message"

# Test 2: Valid request with workspaceId should not return 400 (but might return 401/403)
echo "Testing valid request structure..."
RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/projects" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Project","workspaceId":"550e8400-e29b-41d4-a716-446655440000"}' || echo "000")

HTTP_CODE="${RESPONSE: -3}"

if [ "$HTTP_CODE" = "400" ]; then
  echo "❌ Valid request structure should not return 400"
  echo "Response: ${RESPONSE%???}"
  exit 1
fi

echo "✅ Contract check passed: Valid request structure accepted"

echo "🎉 All contract checks passed!"
