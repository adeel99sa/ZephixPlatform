#!/usr/bin/env bash
set -euo pipefail

echo "🧪 Testing Cloudflare API Proxy Configuration"
echo "=============================================="
echo ""

# Test 1: Health check
echo "Test 1: Health endpoint"
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "https://getzephix.com/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Health check passed (200)"
else
  echo "❌ Health check failed (HTTP $HTTP_CODE)"
  echo "Response: $HEALTH_RESPONSE"
  exit 1
fi

echo ""

# Test 2: Login API
echo "Test 2: Login endpoint"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://getzephix.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"adeel99sa@yahoo.com","password":"ReAdY4wK73967#!@"}')

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Login successful (HTTP $HTTP_CODE)"
  
  # Check if response is valid JSON
  if echo "$BODY" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS=$(echo "$BODY" | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
      echo "✅ Login response valid (success: true)"
      EMAIL=$(echo "$BODY" | jq -r '.data.user.email')
      echo "   User: $EMAIL"
    else
      echo "❌ Login response indicates failure"
      exit 1
    fi
  else
    echo "❌ Response is not valid JSON"
    echo "Response: $BODY"
    exit 1
  fi
else
  echo "❌ Login failed (HTTP $HTTP_CODE)"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo "🎉 All Cloudflare proxy tests passed!"
echo ""
echo "Summary:"
echo "- Health endpoint: ✅ Working"
echo "- Login endpoint: ✅ Working"
echo "- API routing: ✅ Cloudflare → Backend"
