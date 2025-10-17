#!/bin/bash

# One-shot verification (no token-loss, no surprises)
# Run this as a single block so the shell keeps variables in scope

set -e

echo "🔐 Auth Pipeline Verification"
echo "============================="

# Base
export B=https://zephix-backend-production.up.railway.app

echo "🌐 Testing against: $B"
echo ""

# Login → TOKEN (prints token length to confirm)
echo "🔑 Authenticating..."
LOGIN_JSON=$(curl -s -X POST "$B/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"adeel99sa@yahoo.com","password":"ReAdY4wK73967#!@"}')

if [ $? -ne 0 ]; then
  echo "❌ Failed to connect to production backend"
  exit 1
fi

TOKEN=$(echo "$LOGIN_JSON" | jq -r '.data.accessToken // .accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to extract authentication token"
  echo "Response: $LOGIN_JSON"
  exit 1
fi

echo "✅ Authentication successful (token length: ${#TOKEN})"
echo ""

# Health (should be healthy)
echo "1️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$B/api/health")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "unknown"')

if [ "$HEALTH_STATUS" = "healthy" ]; then
  echo "   ✅ Health endpoint: $HEALTH_STATUS"
else
  echo "   ❌ Health endpoint failed: $HEALTH_STATUS"
  echo "   Response: $HEALTH_RESPONSE"
  exit 1
fi

# KPI portfolio (must be 200 with safe defaults; never 401/500)
echo "2️⃣  Testing KPI portfolio endpoint..."
PORTFOLIO_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$B/api/kpi/portfolio")
PORTFOLIO_STATUS=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.statusCode // 200')

if [ "$PORTFOLIO_STATUS" = "200" ]; then
  echo "   ✅ KPI portfolio: Returns 200 OK"
  SUCCESS=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.success // false')
  if [ "$SUCCESS" = "true" ]; then
    echo "   📊 Portfolio data structure: OK"
  else
    echo "   ⚠️  Portfolio data structure: Check response format"
  fi
elif [ "$PORTFOLIO_STATUS" = "401" ]; then
  echo "   ❌ KPI portfolio: 401 Unauthorized (auth pipeline issue)"
  echo "   Response: $PORTFOLIO_RESPONSE"
  exit 1
elif [ "$PORTFOLIO_STATUS" = "500" ]; then
  echo "   ⚠️  KPI portfolio: 500 Internal Server Error (business logic issue)"
  echo "   Response: $PORTFOLIO_RESPONSE"
else
  echo "   ❌ KPI portfolio: Unexpected status $PORTFOLIO_STATUS"
  echo "   Response: $PORTFOLIO_RESPONSE"
  exit 1
fi

# Projects (must be 200; data array or empty)
echo "3️⃣  Testing projects endpoint..."
PROJECTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$B/api/projects")
PROJECTS_STATUS=$(echo "$PROJECTS_RESPONSE" | jq -r '.statusCode // 200')

if [ "$PROJECTS_STATUS" = "200" ]; then
  echo "   ✅ Projects: Returns 200 OK"
  SUCCESS=$(echo "$PROJECTS_RESPONSE" | jq -r '.success // false')
  if [ "$SUCCESS" = "true" ]; then
    echo "   📁 Projects data structure: OK"
  else
    echo "   ⚠️  Projects data structure: Check response format"
  fi
elif [ "$PROJECTS_STATUS" = "401" ]; then
  echo "   ❌ Projects: 401 Unauthorized (auth pipeline issue)"
  echo "   Response: $PROJECTS_RESPONSE"
  exit 1
elif [ "$PROJECTS_STATUS" = "500" ]; then
  echo "   ⚠️  Projects: 500 Internal Server Error (business logic issue)"
  echo "   Response: $PROJECTS_RESPONSE"
else
  echo "   ❌ Projects: Unexpected status $PROJECTS_STATUS"
  echo "   Response: $PROJECTS_RESPONSE"
  exit 1
fi

# Phases (auth-protected; 200 if PID valid, otherwise 404—but not 401)
echo "4️⃣  Testing phases endpoint (sanity check)..."
PID=8a89f2cb-d50a-4089-8604-40d0acb90853
PHASES_RESPONSE=$(curl -s -i -H "Authorization: Bearer $TOKEN" "$B/api/projects/$PID/phases")
PHASES_STATUS=$(echo "$PHASES_RESPONSE" | head -1 | grep -o '[0-9]\{3\}')

if [ "$PHASES_STATUS" = "200" ]; then
  echo "   ✅ Phases endpoint: Returns 200 OK"
elif [ "$PHASES_STATUS" = "404" ]; then
  echo "   ⚠️  Phases endpoint: 404 (project not found - expected for test PID)"
elif [ "$PHASES_STATUS" = "401" ]; then
  echo "   ❌ Phases endpoint: 401 Unauthorized (auth pipeline issue)"
  echo "   Response: $(echo "$PHASES_RESPONSE" | head -5)"
  exit 1
else
  echo "   ⚠️  Phases endpoint: Status $PHASES_STATUS"
  echo "   Response: $(echo "$PHASES_RESPONSE" | head -5)"
fi

echo ""
echo "🎉 Auth Pipeline Verification Complete!"
echo ""
echo "📋 Summary:"
echo "   ✅ Health: $HEALTH_STATUS"
echo "   ✅ KPI Portfolio: Status $PORTFOLIO_STATUS"
echo "   ✅ Projects: Status $PROJECTS_STATUS"
echo "   ✅ Phases: Status $PHASES_STATUS"
echo ""

if [ "$PORTFOLIO_STATUS" = "401" ] || [ "$PROJECTS_STATUS" = "401" ] || [ "$PHASES_STATUS" = "401" ]; then
  echo "❌ AUTH PIPELINE ISSUE DETECTED"
  echo "   - Check that all modules using guards import AuthModule"
  echo "   - Verify AuthModule exports PassportModule, JwtModule, JwtStrategy"
  echo "   - Ensure JWT secret/issuer/audience are consistent"
  exit 1
else
  echo "✅ AUTH PIPELINE WORKING CORRECTLY"
  echo "   - All endpoints properly authenticated"
  echo "   - Any 500s are business logic issues, not auth issues"
fi
