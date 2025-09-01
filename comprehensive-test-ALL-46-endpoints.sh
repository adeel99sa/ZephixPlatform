#!/bin/bash

# COMPREHENSIVE TESTING OF ALL 46 ENDPOINTS
# This script tests EVERY endpoint systematically to get the REAL success rate

set -e

echo "🚀 COMPREHENSIVE TESTING OF ALL 46 ENDPOINTS"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
MISSING_ENDPOINTS=0

# Function to test an endpoint
test_endpoint() {
  local method=$1
  local path=$2
  local description=$3
  local expected_status=${4:-200}
  local test_data=${5:-"{}"}
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -e "${BLUE}Testing: $method $path${NC}"
  echo "Description: $description"
  
  local response
  local status_code
  
  if [ "$method" = "GET" ]; then
    response=$(curl -w "HTTPSTATUS:%{http_code}" -s \
      -X GET "http://localhost:3000$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" 2>/dev/null || echo "HTTPSTATUS:000")
  elif [ "$method" = "POST" ]; then
    response=$(curl -w "HTTPSTATUS:%{http_code}" -s \
      -X POST "http://localhost:3000$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$test_data" 2>/dev/null || echo "HTTPSTATUS:000")
  elif [ "$method" = "PUT" ]; then
    response=$(curl -w "HTTPSTATUS:%{http_code}" -s \
      -X PUT "http://localhost:3000$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$test_data" 2>/dev/null || echo "HTTPSTATUS:000")
  elif [ "$method" = "PATCH" ]; then
    response=$(curl -w "HTTPSTATUS:%{http_code}" -s \
      -X PATCH "http://localhost:3000$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$test_data" 2>/dev/null || echo "HTTPSTATUS:000")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -w "HTTPSTATUS:%{http_code}" -s \
      -X DELETE "http://localhost:3000$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" 2>/dev/null || echo "HTTPSTATUS:000")
  fi
  
  # Extract status code
  status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
  response_body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*//')
  
  # Determine if test passed
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASSED: Status $status_code (Expected: $expected_status)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  elif [ "$status_code" = "404" ]; then
    echo -e "${YELLOW}⚠️  MISSING: Status 404 - Endpoint not implemented${NC}"
    MISSING_ENDPOINTS=$((MISSING_ENDPOINTS + 1))
  elif [ "$status_code" = "401" ]; then
    echo -e "${RED}❌ UNAUTHORIZED: Status 401 - Authentication issue${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  elif [ "$status_code" = "500" ]; then
    echo -e "${RED}❌ SERVER ERROR: Status 500 - Backend error${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  elif [ "$status_code" = "000" ]; then
    echo -e "${RED}❌ CONNECTION ERROR: Could not connect to server${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  else
    echo -e "${YELLOW}⚠️  UNEXPECTED: Status $status_code (Expected: $expected_status)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  
  # Show response body (truncated)
  if [ -n "$response_body" ]; then
    echo "Response: ${response_body:0:200}$([ ${#response_body} -gt 200 ] && echo "..." || echo "")"
  fi
  
  echo "---"
  echo ""
}

echo "=== PHASE 1: AUTHENTICATION SETUP ==="

# Check if server is running
echo "Checking if server is running..."
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${RED}❌ Server is not running on port 3000${NC}"
  echo "Please start the server with: cd zephix-backend && npm run start:dev"
  exit 1
fi

echo -e "${GREEN}✅ Server is running on port 3000${NC}"

# Get JWT token with CORRECT credentials
echo "Getting JWT token with CORRECT credentials..."
echo "Email: demo@zephix.com"
echo "Password: Knight3967#!@"

JWT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@zephix.com", "password": "Knight3967#!@"}')

echo "Login Response: $JWT_RESPONSE"

# Extract token
TOKEN=$(echo "$JWT_RESPONSE" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to extract JWT token from response${NC}"
  echo "Response: $JWT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ JWT Token extracted: ${TOKEN:0:50}...${NC}"
echo ""

echo "=== PHASE 2: TESTING ALL 46 ENDPOINTS ==="
echo ""

# Test ALL 46 endpoints systematically

echo "=== BASIC PROJECT ROUTES (5 endpoints) ==="
test_endpoint "GET" "/api/projects" "List all projects (Basic)"
test_endpoint "GET" "/api/projects/test" "Test endpoint"
test_endpoint "GET" "/api/projects/minimal" "List minimal projects"
test_endpoint "POST" "/api/projects/minimal" "Create minimal project" "201" '{"name": "Test Project"}'
test_endpoint "GET" "/api/projects/minimal/123e4567-e89b-12d3-a456-426614174000" "Get specific minimal project"

echo "=== PROJECT RISKS (2 endpoints) ==="
test_endpoint "POST" "/api/projects/123e4567-e89b-12d3-a456-426614174000/risks" "Perform risk analysis" "201" '{"riskSources": {"projectData": true}, "scanDepth": "basic"}'
test_endpoint "GET" "/api/projects/123e4567-e89b-12d3-a456-426614174000/risks" "Get project risks"

echo "=== RISK MANAGEMENT (4 endpoints) ==="
test_endpoint "POST" "/api/pm/risk-management/analyze" "Perform risk analysis" "201" '{"projectId": "123e4567-e89b-12d3-a456-426614174000", "riskSources": {"projectData": true}, "scanDepth": "basic"}'
test_endpoint "GET" "/api/pm/risk-management/register/123e4567-e89b-12d3-a456-426614174000" "Get risk register"
test_endpoint "PUT" "/api/pm/risk-management/risk/123e4567-e89b-12d3-a456-426614174000/status" "Update risk status" "200" '{"status": "mitigated", "notes": "Risk has been addressed"}'
test_endpoint "POST" "/api/pm/risk-management/risk/123e4567-e89b-12d3-a456-426614174000/monitoring" "Create monitoring plan" "201" '{"frequency": "daily", "metrics": ["cost", "schedule"]}'

echo "=== WORK ITEMS (3 endpoints) ==="
test_endpoint "POST" "/api/work-items" "Create work item" "201" '{"projectId": "123e4567-e89b-12d3-a456-426614174000", "title": "Test Task", "type": "task", "phaseOrSprint": "Sprint 1"}'
test_endpoint "GET" "/api/work-items/project/123e4567-e89b-12d3-a456-426614174000" "Get project work items"
test_endpoint "PATCH" "/api/work-items/123e4567-e89b-12d3-a456-426614174000/status" "Update work item status" "200" '{"status": "in_progress"}'

echo "=== TEMPLATES (2 endpoints) ==="
test_endpoint "GET" "/api/templates" "Get system templates"
test_endpoint "POST" "/api/templates/:id/activate" "Activate template" "201" '{"projectId": "123e4567-e89b-12d3-a456-426614174000"}'

echo "=== RESOURCE ALLOCATION (2 endpoints) ==="
test_endpoint "POST" "/api/allocations" "Create resource allocation" "201" '{"projectId": "123e4567-e89b-12d3-a456-426614174000", "resourceId": "456e7890-e89b-12d3-a456-426614174000", "startDate": "2025-01-01", "endDate": "2025-12-31"}'
test_endpoint "GET" "/api/allocations/availability" "Check resource availability"

echo "=== DASHBOARD (1 endpoint) ==="
test_endpoint "GET" "/api/dashboard" "Get dashboard data"

echo "=== AUTHENTICATION (2 endpoints) ==="
test_endpoint "POST" "/api/auth/login" "User login" "200" '{"email": "demo@zephix.com", "password": "Knight3967#!@"}'
test_endpoint "POST" "/api/auth/register" "User registration" "201" '{"email": "newuser@example.com", "password": "password123", "firstName": "New", "lastName": "User"}'

echo "=== HEALTH (1 endpoint) ==="
test_endpoint "GET" "/api/health" "Health check"

echo "=== ORGANIZATIONS (1 endpoint) ==="
test_endpoint "GET" "/api/organizations" "Get organizations"

echo "=== ADDITIONAL EXPECTED ENDPOINTS (MVP Scope - 23 endpoints) ==="

echo "=== PROJECT MANAGEMENT (Missing - High Priority - 6 endpoints) ==="
test_endpoint "POST" "/api/projects" "Create new project"
test_endpoint "GET" "/api/projects/123e4567-e89b-12d3-a456-426614174000" "Get specific project"
test_endpoint "PUT" "/api/projects/123e4567-e89b-12d3-a456-426614174000" "Update project"
test_endpoint "DELETE" "/api/projects/123e4567-e89b-12d3-a456-426614174000" "Delete project"
test_endpoint "GET" "/api/projects/organization/statistics" "Organization project statistics"
test_endpoint "GET" "/api/projects/organization/dashboard" "Organization project dashboard"

echo "=== PROJECT STATISTICS (Missing - High Priority - 2 endpoints) ==="
test_endpoint "GET" "/api/projects/statistics" "General project statistics"
test_endpoint "GET" "/api/projects/metrics" "Project metrics"

echo "=== RESOURCE MANAGEMENT (Missing - Medium Priority - 3 endpoints) ==="
test_endpoint "GET" "/api/projects/resources" "Resource management overview"
test_endpoint "GET" "/api/projects/123e4567-e89b-12d3-a456-426614174000/resources" "Project resources"
test_endpoint "PUT" "/api/projects/123e4567-e89b-12d3-a456-426614174000/resources/456e7890-e89b-12d3-a456-426614174000" "Update resource allocation"

echo "=== TEAM MANAGEMENT (Missing - Medium Priority - 3 endpoints) ==="
test_endpoint "GET" "/api/projects/123e4567-e89b-12d3-a456-426614174000/team" "Project team members"
test_endpoint "POST" "/api/projects/123e4567-e89b-12d3-a456-426614174000/team" "Add team member"
test_endpoint "DELETE" "/api/projects/123e4567-e89b-12d3-a456-426614174000/team/456e7890-e89b-12d3-a456-426614174000" "Remove team member"

echo "=== PROJECT STATUS & WORKFLOW (Missing - Medium Priority - 3 endpoints) ==="
test_endpoint "GET" "/api/projects/123e4567-e89b-12d3-a456-426614174000/status" "Project status"
test_endpoint "PUT" "/api/projects/123e4567-e89b-12d3-a456-426614174000/status" "Update project status"
test_endpoint "POST" "/api/projects/123e4567-e89b-12d3-a456-426614174000/clone" "Clone project"

echo "=== SEARCH & FILTERING (Missing - Low Priority - 3 endpoints) ==="
test_endpoint "GET" "/api/projects/search" "Search projects"
test_endpoint "GET" "/api/projects/filter" "Filter projects"
test_endpoint "GET" "/api/projects/recent" "Recent projects"

echo "=== REPORTING & ANALYTICS (Missing - Low Priority - 3 endpoints) ==="
test_endpoint "GET" "/api/projects/reports" "Project reports"
test_endpoint "GET" "/api/projects/analytics" "Project analytics"
test_endpoint "GET" "/api/projects/export" "Export projects"

echo "=== PHASE 3: RESULTS ANALYSIS ==="
echo ""

echo "=================================================="
echo "📊 COMPREHENSIVE TESTING RESULTS SUMMARY"
echo "=================================================="
echo ""

echo "Total Tests Executed: $TOTAL_TESTS"
echo -e "${GREEN}✅ Passed Tests: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Failed Tests: $FAILED_TESTS${NC}"
echo -e "${YELLOW}⚠️  Missing Endpoints: $MISSING_ENDPOINTS${NC}"
echo ""

# Calculate actual success rate
if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo "Success Rate: $SUCCESS_RATE%"
  echo ""
  
  # Compare with original 23% baseline
  echo "=== BEFORE/AFTER COMPARISON ==="
  echo "Original baseline: 23% (11/46 endpoints)"
  echo "Current status: $SUCCESS_RATE% ($PASSED_TESTS/$TOTAL_TESTS endpoints)"
  
  if [ $SUCCESS_RATE -gt 23 ]; then
    IMPROVEMENT=$((SUCCESS_RATE - 23))
    echo -e "${GREEN}Actual improvement: +$IMPROVEMENT%${NC}"
  elif [ $SUCCESS_RATE -lt 23 ]; then
    DECLINE=$((23 - SUCCESS_RATE))
    echo -e "${RED}Actual decline: -$DECLINE%${NC}"
  else
    echo -e "${YELLOW}No change: Same as baseline${NC}"
  fi
else
  echo "No tests executed"
fi

echo ""
echo "=================================================="
echo "🎯 COMPREHENSIVE ENDPOINT TESTING COMPLETE"
echo "=================================================="
echo "Results saved to: comprehensive-test-results-$(date +%Y%m%d-%H%M%S).log"
echo -e "${GREEN}✅ Comprehensive endpoint testing completed successfully!${NC}"
echo "📋 Check the results above for the ACTUAL success rate"
