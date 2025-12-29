#!/bin/bash

# Quick Production Validation Script
# Run this after deploying to verify everything works

set -e

BACKEND_URL="https://zephix-backend-production.up.railway.app"
FRONTEND_URL="https://getzephix.com"

echo "🔍 Zephix Production Validation"
echo "================================"
echo ""

# 1. Backend Health Check
echo "1️⃣  Testing Backend Health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
  echo "   ✅ Health check: PASSED ($HEALTH_RESPONSE)"
else
  echo "   ❌ Health check: FAILED ($HEALTH_RESPONSE)"
  exit 1
fi

# 2. Swagger Docs Check
echo ""
echo "2️⃣  Testing Swagger Docs..."
SWAGGER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/docs")
if [ "$SWAGGER_RESPONSE" = "200" ]; then
  echo "   ✅ Swagger docs: PASSED ($SWAGGER_RESPONSE)"
else
  echo "   ⚠️  Swagger docs: $SWAGGER_RESPONSE (may need auth)"
fi

# 3. Unauthenticated /auth/me
echo ""
echo "3️⃣  Testing Unauthenticated /auth/me..."
UNAUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/auth/me")
if [ "$UNAUTH_RESPONSE" = "401" ]; then
  echo "   ✅ Unauthenticated access: PASSED (401 as expected)"
else
  echo "   ❌ Unauthenticated access: FAILED (expected 401, got $UNAUTH_RESPONSE)"
fi

# 4. CORS Preflight Check
echo ""
echo "4️⃣  Testing CORS..."
CORS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS "$BACKEND_URL/api/auth/register" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST")
if [ "$CORS_RESPONSE" = "200" ] || [ "$CORS_RESPONSE" = "204" ]; then
  echo "   ✅ CORS preflight: PASSED ($CORS_RESPONSE)"
else
  echo "   ⚠️  CORS preflight: $CORS_RESPONSE (check CORS_ALLOWED_ORIGINS)"
fi

# 5. Register Endpoint (Neutral Response)
echo ""
echo "5️⃣  Testing Register Endpoint..."
TIMESTAMP=$(date +%s)
REGISTER_FULL_RESPONSE=$(curl -s -w "\nHTTPCODE:%{http_code}" \
  -X POST "$BACKEND_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test-$TIMESTAMP@validation.com\",
    \"password\": \"SecurePass123!@#\",
    \"fullName\": \"Validation Test\",
    \"orgName\": \"Validation Org $TIMESTAMP\"
  }")
REGISTER_RESPONSE=$(echo "$REGISTER_FULL_RESPONSE" | grep -o "HTTPCODE:[0-9]*" | cut -d: -f2)
REGISTER_BODY=$(echo "$REGISTER_FULL_RESPONSE" | sed 's/HTTPCODE:[0-9]*$//')

if [ "$REGISTER_RESPONSE" = "200" ]; then
  echo "   ✅ Register endpoint: PASSED (200 with neutral response)"
elif [ "$REGISTER_RESPONSE" = "404" ]; then
  echo "   ⚠️  Register endpoint: NOT DEPLOYED (404)"
  echo "   💡 This endpoint exists in code but may not be deployed to production yet"
  echo "   💡 Deploy latest code to Railway to enable /api/auth/register"
  echo "   💡 Response: $(echo "$REGISTER_BODY" | head -c 100)"
else
  echo "   ⚠️  Register endpoint: $REGISTER_RESPONSE (may be validation error or rate limit)"
  echo "   💡 Response: $(echo "$REGISTER_BODY" | head -c 100)"
fi

echo ""
echo "================================"
echo "✅ Basic validation complete!"
echo ""
echo "Next steps:"
echo "1. Open $FRONTEND_URL and check browser console"
echo "2. Test signup flow in browser"
echo "3. Check email for verification link"
echo "4. Test invite creation (requires verified email)"
echo ""

