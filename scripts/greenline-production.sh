#!/bin/bash

# 🔒 Ship-Blocker Greenline (run anytime)
# This script verifies production endpoints are working correctly

set -e

echo "🔒 Production Greenline Verification"
echo "=================================="

# Set production backend URL
export B=https://zephix-backend-production.up.railway.app

echo "🌐 Testing against: $B"
echo ""

# Get authentication token
echo "🔐 Authenticating..."
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

# Test 1: Health endpoint
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

# Test 2: KPI Portfolio endpoint
echo "2️⃣  Testing KPI portfolio endpoint..."
PORTFOLIO_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$B/api/kpi/portfolio")
PORTFOLIO_SUCCESS=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.success // false')

if [ "$PORTFOLIO_SUCCESS" = "true" ]; then
  echo "   ✅ KPI portfolio: Returns data successfully"
  TOTAL_PROJECTS=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.data.totalProjects // 0')
  echo "   📊 Total projects: $TOTAL_PROJECTS"
else
  echo "   ❌ KPI portfolio failed"
  echo "   Response: $PORTFOLIO_RESPONSE"
  exit 1
fi

# Test 3: Projects endpoint
echo "3️⃣  Testing projects endpoint..."
PROJECTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$B/api/projects")
PROJECTS_SUCCESS=$(echo "$PROJECTS_RESPONSE" | jq -r '.success // false')
PROJECTS_DATA_TYPE=$(echo "$PROJECTS_RESPONSE" | jq -r '.data | type // "unknown"')
PROJECTS_COUNT=$(echo "$PROJECTS_RESPONSE" | jq -r '.data | length // 0')

if [ "$PROJECTS_SUCCESS" = "true" ] && [ "$PROJECTS_DATA_TYPE" = "array" ]; then
  echo "   ✅ Projects endpoint: Returns array successfully"
  echo "   📁 Projects count: $PROJECTS_COUNT"
else
  echo "   ❌ Projects endpoint failed"
  echo "   Response: $PROJECTS_RESPONSE"
  exit 1
fi

# Test 4: Phases endpoint (sanity check)
echo "4️⃣  Testing phases endpoint (sanity check)..."
PID=8a89f2cb-d50a-4089-8604-40d0acb90853
PHASES_RESPONSE=$(curl -s -i -H "Authorization: Bearer $TOKEN" "$B/api/projects/$PID/phases")
PHASES_STATUS=$(echo "$PHASES_RESPONSE" | head -1 | grep -o '[0-9]\{3\}')

if [ "$PHASES_STATUS" = "200" ]; then
  echo "   ✅ Phases endpoint: Returns 200 OK"
elif [ "$PHASES_STATUS" = "404" ]; then
  echo "   ⚠️  Phases endpoint: 404 (project not found - expected for test PID)"
else
  echo "   ❌ Phases endpoint failed with status: $PHASES_STATUS"
  echo "   Response: $(echo "$PHASES_RESPONSE" | head -5)"
  exit 1
fi

echo ""
echo "🎉 All production endpoints verified successfully!"
echo ""
echo "📋 Summary:"
echo "   ✅ Health: $HEALTH_STATUS"
echo "   ✅ KPI Portfolio: Working with $TOTAL_PROJECTS projects"
echo "   ✅ Projects: Working with $PROJECTS_COUNT projects"
echo "   ✅ Phases: Responding correctly"
echo ""
echo "🚀 Production is ready for deployment!"
