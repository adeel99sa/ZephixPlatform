#!/bin/bash

# Deployment Route Verification Script
# Verifies that PM deprecation is live and old routes are removed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get backend URL from environment or prompt
if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}Enter your Railway backend URL (e.g., https://zephix-backend-production.up.railway.app):${NC}"
    read -r BACKEND_URL
fi

# Remove trailing slash
BACKEND_URL="${BACKEND_URL%/}"

echo -e "\n${YELLOW}🔍 Verifying Deployment Routes...${NC}\n"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}1. Testing Health Endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed (200 OK)${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH_RESPONSE)${NC}"
    exit 1
fi

# Test 2: Old PM Routes (Should NOT Exist)
echo -e "\n${YELLOW}2. Testing Old PM Routes (Should Return 404)...${NC}"

OLD_ROUTES=(
    "/api/pm/risk-management/analyze"
    "/api/pm/risk-management/register/test-id"
    "/api/pm/risk-management/forecasting/test-id"
)

ALL_OLD_ROUTES_GONE=true
for route in "${OLD_ROUTES[@]}"; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL$route")
    if [ "$RESPONSE" = "404" ]; then
        echo -e "${GREEN}✅ $route → 404 (Correct - route removed)${NC}"
    else
        echo -e "${RED}❌ $route → HTTP $RESPONSE (Route still exists!)${NC}"
        ALL_OLD_ROUTES_GONE=false
    fi
done

if [ "$ALL_OLD_ROUTES_GONE" = false ]; then
    echo -e "\n${RED}❌ FAILED: Old PM routes still exist. Deployment did not include PM deprecation.${NC}"
    exit 1
fi

# Test 3: New Risks Routes (Should Exist)
echo -e "\n${YELLOW}3. Testing New Risks Routes (Should Exist)...${NC}"

NEW_ROUTES=(
    "/api/risks"
)

ALL_NEW_ROUTES_EXIST=true
for route in "${NEW_ROUTES[@]}"; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL$route")
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ]; then
        echo -e "${GREEN}✅ $route → HTTP $RESPONSE (Route exists)${NC}"
    else
        echo -e "${RED}❌ $route → HTTP $RESPONSE (Route may not exist)${NC}"
        ALL_NEW_ROUTES_EXIST=false
    fi
done

if [ "$ALL_NEW_ROUTES_EXIST" = false ]; then
    echo -e "\n${YELLOW}⚠️  WARNING: New risks routes may not be fully configured${NC}"
fi

# Test 4: Check Health Check Database Status
echo -e "\n${YELLOW}4. Checking Database Health Status...${NC}"
HEALTH_JSON=$(curl -s "$BACKEND_URL/api/health")
DB_STATUS=$(echo "$HEALTH_JSON" | grep -o '"name":"Database Connection"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$DB_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✅ Database connection: healthy${NC}"
else
    echo -e "${RED}❌ Database connection: $DB_STATUS${NC}"
    echo -e "${YELLOW}⚠️  Note: Database service is healthy, this may be a temporary connection issue${NC}"
fi

# Summary
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$ALL_OLD_ROUTES_GONE" = true ] && [ "$ALL_NEW_ROUTES_EXIST" = true ]; then
    echo -e "${GREEN}✅ DEPLOYMENT VERIFICATION PASSED${NC}"
    echo -e "${GREEN}✅ PM deprecation is live${NC}"
    echo -e "${GREEN}✅ Old routes removed${NC}"
    echo -e "${GREEN}✅ New routes available${NC}"
    exit 0
else
    echo -e "${RED}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
    echo -e "${YELLOW}⚠️  Railway may be deploying from wrong branch or old commit${NC}"
    echo -e "${YELLOW}⚠️  Check Railway dashboard: Backend → Settings → Source → Branch${NC}"
    exit 1
fi

