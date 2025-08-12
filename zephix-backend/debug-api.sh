#!/bin/bash

echo "🔍 Zephix API Debug Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test URLs
RAILWAY_URL="https://zephix-backend-production.up.railway.app"
CLOUDFLARE_URL="https://api.getzephix.com"

echo -e "\n${BLUE}1. Testing Railway Origin Directly${NC}"
echo "----------------------------------------"

echo -e "\n${YELLOW}Testing health endpoint:${NC}"
curl -v -s -w "\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  "${RAILWAY_URL}/api/health" 2>&1

echo -e "\n${YELLOW}Testing OPTIONS on login:${NC}"
curl -v -s -w "\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  -X OPTIONS "${RAILWAY_URL}/api/auth/login" 2>&1

echo -e "\n${YELLOW}Testing POST on login (should fail with 401):${NC}"
curl -v -s -w "\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  -X POST "${RAILWAY_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' 2>&1

echo -e "\n${BLUE}2. Testing Cloudflare Proxy${NC}"
echo "--------------------------------"

echo -e "\n${YELLOW}Testing health endpoint via Cloudflare:${NC}"
curl -v -s -w "\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  "${CLOUDFLARE_URL}/api/health" 2>&1

echo -e "\n${YELLOW}Testing OPTIONS on login via Cloudflare:${NC}"
curl -v -s -w "\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  -X OPTIONS "${CLOUDFLARE_URL}/api/auth/login" 2>&1

echo -e "\n${YELLOW}Testing POST on login via Cloudflare (should fail with 401):${NC}"
curl -v -s -w "\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  -X POST "${CLOUDFLARE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' 2>&1

echo -e "\n${BLUE}3. DNS Resolution Test${NC}"
echo "---------------------------"

echo -e "\n${YELLOW}Resolving api.getzephix.com:${NC}"
nslookup api.getzephix.com 2>&1

echo -e "\n${YELLOW}Resolving zephix-backend-production.up.railway.app:${NC}"
nslookup zephix-backend-production.up.railway.app 2>&1

echo -e "\n${BLUE}4. Summary${NC}"
echo "--------"
echo -e "${GREEN}✅ Fast 2xx or 4xx responses = Origin reachable${NC}"
echo -e "${RED}❌ Long hang then fail = Cloudflare or routing issue${NC}"
echo -e "${RED}❌ 404 = Wrong path or backend not running${NC}"
echo -e "${YELLOW}⚠️  CORS errors in curl = Browser-only issue${NC}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo "1. Check the output above for any hanging requests"
echo "2. If Railway origin works but Cloudflare hangs = Cloudflare issue"
echo "3. If both hang = Backend issue"
echo "4. Check Railway service status and logs"
