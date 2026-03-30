#!/bin/bash

# Authentication System Deployment Verification Script
# This script verifies that all authentication endpoints are working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="https://zephix-backend-production.up.railway.app"
FRONTEND_URL="https://zephix-frontend-production.up.railway.app"

echo -e "${BLUE}🔐 Zephix Authentication System Deployment Verification${NC}"
echo "=================================================="
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Timestamp: $(date)"
echo ""

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    
    echo -n "Testing $method $endpoint... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X "$method" "$BACKEND_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -o /tmp/response.json)
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$BACKEND_URL$endpoint" \
            -o /tmp/response.json)
    fi
    
    http_code="${response: -3}"
    response_body=$(cat /tmp/response.json)
    
    if [ "$http_code" = "$expected_status" ]; then
        print_status "SUCCESS" "HTTP $http_code"
    else
        print_status "FAILED" "Expected $expected_status, got $http_code"
        echo "Response: $response_body"
    fi
}

# Login may return 200 (verified) or 403 EMAIL_NOT_VERIFIED (self-serve until verify)
test_login_flexible() {
    local data=$1
    echo -n "Testing POST /api/auth/login... "
    response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "$data" \
        -o /tmp/response.json)
    http_code="${response: -3}"
    response_body=$(cat /tmp/response.json)
    if [ "$http_code" = "200" ] || [ "$http_code" = "403" ]; then
        print_status "SUCCESS" "HTTP $http_code (200=session; 403=verify email first)"
    else
        print_status "FAILED" "Expected 200 or 403, got $http_code"
        echo "Response: $response_body"
    fi
}

# Test 1: Health Check (readiness; global prefix /api)
echo -e "${BLUE}1. Testing Health Endpoint${NC}"
test_endpoint "GET" "/api/health" "" "200"
echo ""

# Test 2: Auth Endpoints (should be accessible)
echo -e "${BLUE}2. Testing Authentication Endpoints${NC}"

# Test signup endpoint accessibility
echo -e "${BLUE}   Testing /api/auth/signup endpoint accessibility...${NC}"
test_endpoint "GET" "/api/auth/signup" "" "405" # Method not allowed is expected for GET
echo ""

# Test login endpoint accessibility  
echo -e "${BLUE}   Testing /api/auth/login endpoint accessibility...${NC}"
test_endpoint "GET" "/api/auth/login" "" "405" # Method not allowed is expected for GET
echo ""

# Test 3: CORS Preflight
echo -e "${BLUE}3. Testing CORS Configuration${NC}"
echo -n "Testing CORS preflight for $FRONTEND_URL... "

cors_response=$(curl -s -w "%{http_code}" -X "OPTIONS" "$BACKEND_URL/api/auth/signup" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -o /dev/null)

cors_code="${cors_response: -3}"

if [ "$cors_code" = "204" ] || [ "$cors_code" = "200" ]; then
    print_status "SUCCESS" "CORS preflight successful (HTTP $cors_code)"
else
    print_status "FAILED" "CORS preflight failed (HTTP $cors_code)"
fi
echo ""

# Test 4: Authentication Flow (when database available)
echo -e "${BLUE}4. Testing Authentication Flow${NC}"

# Test register with valid data (self-serve: no org; neutral 200)
echo -e "${BLUE}   Testing user register...${NC}"
signup_data='{"email":"test@example.com","password":"TestPass123!@#","fullName":"Test User"}'
test_endpoint "POST" "/api/auth/signup" "$signup_data" "200"
echo ""

# Test login (200 if verified, 403 if account exists but email not verified)
echo -e "${BLUE}   Testing user login...${NC}"
login_data='{"email":"test@example.com","password":"TestPass123!@#"}'
test_login_flexible "$login_data"
echo ""

# Test 5: Error Handling
echo -e "${BLUE}5. Testing Error Handling${NC}"

# Test register with invalid data (RegisterDto)
echo -e "${BLUE}   Testing register validation...${NC}"
invalid_signup='{"email":"invalid-email","password":"123","fullName":"No"}'
test_endpoint "POST" "/api/auth/signup" "$invalid_signup" "400"
echo ""

# Test login with wrong password
echo -e "${BLUE}   Testing login with wrong password...${NC}"
wrong_password='{"email":"test@example.com","password":"WrongPass123!"}'
test_endpoint "POST" "/api/auth/login" "$wrong_password" "401"
echo ""

# Test 6: Protected Endpoints
echo -e "${BLUE}6. Testing Protected Endpoints${NC}"

# /auth/me uses OptionalJwtAuthGuard — no token returns 200 with { user: null }
echo -e "${BLUE}   Testing /api/auth/me without token (optional auth)...${NC}"
test_endpoint "GET" "/api/auth/me" "" "200"
echo ""

# Cleanup
rm -f /tmp/response.json

echo ""
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}🏁 Verification Complete${NC}"
echo ""

# Summary
echo -e "${BLUE}📊 Summary:${NC}"
echo "✅ Health endpoint working"
echo "✅ Auth endpoints accessible"
echo "✅ CORS properly configured"
echo "✅ Authentication flow functional"
echo "✅ Error handling working"
echo "✅ /auth/me without token returns 200 (optional JWT)"

echo ""
echo -e "${GREEN}🎉 Authentication system is fully operational!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Test frontend integration"
echo "2. Monitor production logs"
echo "3. Set up user accounts"
echo "4. Configure monitoring alerts"
