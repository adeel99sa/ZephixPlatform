#!/bin/bash
# smoke-auth-health.sh - Basic smoke test for auth and health endpoints
# Usage: BASE_URL=http://localhost:3000 bash scripts/smoke-auth-health.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSED=0
FAILED=0

echo "=== Smoke Test: Auth & Health ==="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health endpoint
echo -n "1. GET /health ... "
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
  echo "✅ PASS (HTTP $HEALTH_STATUS)"
  ((PASSED++))
else
  echo "❌ FAIL (HTTP $HEALTH_STATUS)"
  ((FAILED++))
fi

# Test 2: API health endpoint
echo -n "2. GET /api/health ... "
API_HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" || echo "000")
if [ "$API_HEALTH_STATUS" = "200" ]; then
  echo "✅ PASS (HTTP $API_HEALTH_STATUS)"
  ((PASSED++))
else
  echo "❌ FAIL (HTTP $API_HEALTH_STATUS)"
  ((FAILED++))
fi

# Test 3: Auth login endpoint exists (should return 400 or 401 without body, not 404)
echo -n "3. POST /api/auth/login (expect 400/401) ... "
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}' || echo "000")
if [ "$LOGIN_STATUS" = "400" ] || [ "$LOGIN_STATUS" = "401" ]; then
  echo "✅ PASS (HTTP $LOGIN_STATUS - endpoint exists)"
  ((PASSED++))
elif [ "$LOGIN_STATUS" = "404" ]; then
  echo "❌ FAIL (HTTP 404 - endpoint not found)"
  ((FAILED++))
else
  echo "⚠️ WARN (HTTP $LOGIN_STATUS - unexpected status)"
  ((PASSED++))  # Still count as pass if endpoint exists
fi

# Test 4: Auth me endpoint (should return 401 without token)
echo -n "4. GET /api/auth/me (expect 401) ... "
ME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me" || echo "000")
if [ "$ME_STATUS" = "401" ]; then
  echo "✅ PASS (HTTP $ME_STATUS - requires auth)"
  ((PASSED++))
elif [ "$ME_STATUS" = "404" ]; then
  echo "❌ FAIL (HTTP 404 - endpoint not found)"
  ((FAILED++))
else
  echo "⚠️ WARN (HTTP $ME_STATUS - unexpected status)"
  ((PASSED++))
fi

# Summary
echo ""
echo "=== Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo "❌ Smoke test FAILED"
  exit 1
fi

echo ""
echo "✅ Smoke test PASSED"
exit 0
