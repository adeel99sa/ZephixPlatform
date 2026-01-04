#!/usr/bin/env bash
# Phase 4.1 Portfolio and Program Verification Script
#
# Required Environment Variables:
#   BASE - Backend base URL (e.g., "https://zephix-backend-production.up.railway.app")
#   TOKEN - Authentication token (obtain via: source scripts/auth-login.sh)
#
# Optional Environment Variables:
#   ORG_ID - Organization ID (will be fetched if not provided)
#   WORKSPACE_ID - Workspace ID (will be fetched if not provided, required for summary endpoints)
#   PROJECT_ID - Project ID (will be fetched if not provided)
#
# Usage:
#   export BASE="https://zephix-backend-production.up.railway.app"
#   source scripts/auth-login.sh  # Sets TOKEN
#   bash scripts/phase4-portfolio-program-verify.sh
#
# This script verifies Phase 4.1 deployment by:
# 1. Preflight: Check commitShaTrusted
# 2. ID discovery: Fetch orgs, workspaces, projects
# 3. Portfolio and Program tests:
#    - Create portfolio and program
#    - Add project to portfolio
#    - Assign program to project
#    - Call both summary endpoints with date range
#    - Validate response structure
#
# Exit codes:
#   0 - All checks passed
#   1 - Preflight failed
#   2 - ID discovery failed
#   3 - Portfolio/Program test failed

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE:-https://zephix-backend-production.up.railway.app}"

# Check required environment variables
if [ -z "${BASE:-}" ]; then
  echo -e "${RED}❌ ERROR: BASE environment variable is required${NC}"
  echo "   export BASE=\"https://zephix-backend-production.up.railway.app\""
  exit 1
fi

if [ -z "${TOKEN:-}" ]; then
  echo -e "${RED}❌ ERROR: TOKEN environment variable is required${NC}"
  echo ""
  echo "   To get a token, run:"
  echo "   export BASE=\"$BASE_URL\""
  echo "   source scripts/auth-login.sh"
  echo ""
  echo "   Important: Use 'source' (not 'bash') to export TOKEN to current shell"
  echo ""
  echo "   Or manually:"
  echo "   export TOKEN=\"your-auth-token\""
  exit 1
fi

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ ERROR: jq is required but not installed${NC}"
  exit 1
fi

echo -e "${GREEN}🚀 Phase 4.1 Portfolio and Program Verification${NC}"
echo "=============================================="
echo ""

# Helper function for JSON API calls with error handling
curl_json() {
  local method="$1"
  local endpoint="$2"
  local body="${3:-}"
  local workspace_header="${4:-}"

  local headers=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
  if [ -n "$workspace_header" ]; then
    headers+=(-H "x-workspace-id: $workspace_header")
  fi

  local url="$BASE_URL$endpoint"
  local response
  local status
  local http_code

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -D /tmp/curl_headers.txt "$url" "${headers[@]}" 2>&1)
  elif [ "$method" = "POST" ] || [ "$method" = "PATCH" ] || [ "$method" = "DELETE" ]; then
    if [ -n "$body" ]; then
      response=$(curl -s -w "\n%{http_code}" -D /tmp/curl_headers.txt -X "$method" "$url" "${headers[@]}" -d "$body" 2>&1)
    else
      response=$(curl -s -w "\n%{http_code}" -D /tmp/curl_headers.txt -X "$method" "$url" "${headers[@]}" 2>&1)
    fi
  fi

  http_code=$(echo "$response" | tail -n1)
  status="$http_code"
  body=$(echo "$response" | sed '$d')

  # Extract requestId from headers if present
  local request_id=""
  if [ -f /tmp/curl_headers.txt ]; then
    request_id=$(grep -i "x-request-id:" /tmp/curl_headers.txt | cut -d' ' -f2 | tr -d '\r' || echo "")
    rm -f /tmp/curl_headers.txt
  fi

  # Print status and body on error
  if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
    echo -e "${RED}❌ HTTP $http_code${NC}" >&2
    echo "$body" | jq '.' 2>/dev/null || echo "$body" >&2
    if [ -n "$request_id" ]; then
      echo -e "${YELLOW}RequestId: $request_id${NC}" >&2
    fi
  fi

  echo "$status|$body|$request_id"
}

# Helper function to make API calls with error handling (backward compatibility)
api_call() {
  curl_json "$@"
}

# Step 0: Routing Guard Check
echo -e "${YELLOW}📋 Step 0: Routing Guard Check${NC}"
echo "Checking /api/portfolios and /api/programs routes exist..."

PORTFOLIOS_ROUTE_RESPONSE=$(api_call "GET" "/api/portfolios" "" "")
PORTFOLIOS_ROUTE_STATUS=$(echo "$PORTFOLIOS_ROUTE_RESPONSE" | cut -d'|' -f1)
PORTFOLIOS_ROUTE_BODY=$(echo "$PORTFOLIOS_ROUTE_RESPONSE" | cut -d'|' -f2)

if [ "$PORTFOLIOS_ROUTE_STATUS" = "404" ]; then
  echo -e "${RED}❌ ERROR: /api/portfolios returned 404${NC}"
  echo "$PORTFOLIOS_ROUTE_BODY" | jq '.' || echo "$PORTFOLIOS_ROUTE_BODY"
  exit 1
fi

PROGRAMS_ROUTE_RESPONSE=$(api_call "GET" "/api/programs" "" "")
PROGRAMS_ROUTE_STATUS=$(echo "$PROGRAMS_ROUTE_RESPONSE" | cut -d'|' -f1)
PROGRAMS_ROUTE_BODY=$(echo "$PROGRAMS_ROUTE_RESPONSE" | cut -d'|' -f2)

if [ "$PROGRAMS_ROUTE_STATUS" = "404" ]; then
  echo -e "${RED}❌ ERROR: /api/programs returned 404${NC}"
  echo "$PROGRAMS_ROUTE_BODY" | jq '.' || echo "$PROGRAMS_ROUTE_BODY"
  exit 1
fi

echo -e "${GREEN}✅ Routes exist (portfolios: $PORTFOLIOS_ROUTE_STATUS, programs: $PROGRAMS_ROUTE_STATUS)${NC}"
echo ""

# Step 1: Preflight
echo -e "${YELLOW}📋 Step 1: Preflight Check${NC}"
echo "Checking /api/version for commitShaTrusted..."
VERSION_RESPONSE=$(api_call "GET" "/api/version" "" "")
STATUS=$(echo "$VERSION_RESPONSE" | cut -d'|' -f1)
BODY=$(echo "$VERSION_RESPONSE" | cut -d'|' -f2)

if [ "$STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: /api/version returned $STATUS${NC}"
  echo "$BODY"
  exit 1
fi

# Fail fast on 401, 403, 500
if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ] || [ "$STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: Preflight failed with $STATUS${NC}"
  echo "$BODY"
  exit 1
fi

COMMIT_SHA_TRUSTED=$(echo "$BODY" | jq -r '.data.commitShaTrusted // false')
if [ "$COMMIT_SHA_TRUSTED" != "true" ]; then
  echo -e "${RED}❌ ERROR: commitShaTrusted is not true${NC}"
  echo "Response: $BODY"
  exit 1
fi

COMMIT_SHA=$(echo "$BODY" | jq -r '.data.commitSha // "unknown"')
echo -e "${GREEN}✅ Preflight passed (commitShaTrusted: true, commitSha: ${COMMIT_SHA:0:7}...)${NC}"
echo ""

# Step 2: ID Discovery
echo -e "${YELLOW}📋 Step 2: ID Discovery${NC}"

if [ -z "${ORG_ID:-}" ]; then
  echo "Fetching Organization ID..."
  ORG_RESPONSE=$(api_call "GET" "/api/organizations" "" "")
  ORG_STATUS=$(echo "$ORG_RESPONSE" | cut -d'|' -f1)
  ORG_BODY=$(echo "$ORG_RESPONSE" | cut -d'|' -f2)

  if [ "$ORG_STATUS" != "200" ]; then
    echo -e "${RED}❌ ERROR: Failed to fetch organizations ($ORG_STATUS)${NC}"
    echo "$ORG_BODY"
    exit 2
  fi

  ORG_ID=$(echo "$ORG_BODY" | jq -r '.data[0].id // empty')
  if [ -z "$ORG_ID" ]; then
    echo -e "${RED}❌ ERROR: No organization found${NC}"
    exit 2
  fi
  echo "✅ ORG_ID: $ORG_ID"
else
  echo "✅ ORG_ID: $ORG_ID (from env)"
fi

if [ -z "${WORKSPACE_ID:-}" ]; then
  echo "Fetching Workspace ID..."
  WS_RESPONSE=$(api_call "GET" "/api/workspaces" "" "")
  WS_STATUS=$(echo "$WS_RESPONSE" | cut -d'|' -f1)
  WS_BODY=$(echo "$WS_RESPONSE" | cut -d'|' -f2)

  if [ "$WS_STATUS" != "200" ]; then
    echo -e "${RED}❌ ERROR: Failed to fetch workspaces ($WS_STATUS)${NC}"
    echo "$WS_BODY"
    exit 2
  fi

  WORKSPACE_ID=$(echo "$WS_BODY" | jq -r '.data[0].id // empty')
  if [ -z "$WORKSPACE_ID" ]; then
    echo -e "${RED}❌ ERROR: No workspace found${NC}"
    exit 2
  fi
  echo "✅ WORKSPACE_ID: $WORKSPACE_ID"
  # Export WORKSPACE_ID for use in summary endpoints
  export WORKSPACE_ID
else
  echo "✅ WORKSPACE_ID: $WORKSPACE_ID (from env)"
  export WORKSPACE_ID
fi

if [ -z "${PROJECT_ID:-}" ]; then
  echo "Fetching Project ID..."
  PROJ_RESPONSE=$(api_call "GET" "/api/projects" "" "$WORKSPACE_ID")
  PROJ_STATUS=$(echo "$PROJ_RESPONSE" | cut -d'|' -f1)
  PROJ_BODY=$(echo "$PROJ_RESPONSE" | cut -d'|' -f2)

  if [ "$PROJ_STATUS" != "200" ]; then
    echo -e "${RED}❌ ERROR: Failed to fetch projects ($PROJ_STATUS)${NC}"
    echo "$PROJ_BODY"
    exit 2
  fi

  PROJECT_ID=$(echo "$PROJ_BODY" | jq -r '.data.items[0].id // .data.projects[0].id // .data[0].id // empty')
  if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ ERROR: No project found${NC}"
    exit 2
  fi
  echo "✅ PROJECT_ID: $PROJECT_ID"
else
  echo "✅ PROJECT_ID: $PROJECT_ID (from env)"
fi

echo ""

# Step 3: Portfolio and Program Tests
echo -e "${YELLOW}📋 Step 3: Portfolio and Program Tests${NC}"

# 3.1: Create portfolio
echo "3.1: Creating portfolio..."
PORTFOLIO_BODY=$(cat <<EOF
{
  "name": "Phase4 Test Portfolio $(date +%s)",
  "description": "Test portfolio for Phase 4.1 verification",
  "status": "active"
}
EOF
)

PORTFOLIO_RESPONSE=$(api_call "POST" "/api/portfolios" "$PORTFOLIO_BODY" "")
PORTFOLIO_STATUS=$(echo "$PORTFOLIO_RESPONSE" | cut -d'|' -f1)
PORTFOLIO_BODY_RESP=$(echo "$PORTFOLIO_RESPONSE" | cut -d'|' -f2)
PORTFOLIO_REQUEST_ID=$(echo "$PORTFOLIO_RESPONSE" | cut -d'|' -f3)

if [ "$PORTFOLIO_STATUS" != "201" ] && [ "$PORTFOLIO_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to create portfolio ($PORTFOLIO_STATUS)${NC}"
  if [ -n "$PORTFOLIO_REQUEST_ID" ]; then
    echo "RequestId: $PORTFOLIO_REQUEST_ID"
  fi
  echo "$PORTFOLIO_BODY_RESP" | jq '.' || echo "$PORTFOLIO_BODY_RESP"
  exit 3
fi

PORTFOLIO_ID=$(echo "$PORTFOLIO_BODY_RESP" | jq -r '.data.id // .id // empty')
if [ -z "$PORTFOLIO_ID" ]; then
  echo -e "${RED}❌ ERROR: Portfolio ID not found in response${NC}"
  exit 3
fi
echo -e "${GREEN}✅ Portfolio created: $PORTFOLIO_ID${NC}"

# 3.2: Create program
echo "3.2: Creating program..."
PROGRAM_BODY=$(cat <<EOF
{
  "portfolioId": "$PORTFOLIO_ID",
  "name": "Phase4 Test Program $(date +%s)",
  "description": "Test program for Phase 4.1 verification",
  "status": "active"
}
EOF
)

PROGRAM_RESPONSE=$(api_call "POST" "/api/programs" "$PROGRAM_BODY" "")
PROGRAM_STATUS=$(echo "$PROGRAM_RESPONSE" | cut -d'|' -f1)
PROGRAM_BODY_RESP=$(echo "$PROGRAM_RESPONSE" | cut -d'|' -f2)
PROGRAM_REQUEST_ID=$(echo "$PROGRAM_RESPONSE" | cut -d'|' -f3)

if [ "$PROGRAM_STATUS" != "201" ] && [ "$PROGRAM_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to create program ($PROGRAM_STATUS)${NC}"
  if [ -n "$PROGRAM_REQUEST_ID" ]; then
    echo "RequestId: $PROGRAM_REQUEST_ID"
  fi
  echo "$PROGRAM_BODY_RESP" | jq '.' || echo "$PROGRAM_BODY_RESP"
  exit 3
fi

PROGRAM_ID=$(echo "$PROGRAM_BODY_RESP" | jq -r '.data.id // .id // empty')
if [ -z "$PROGRAM_ID" ]; then
  echo -e "${RED}❌ ERROR: Program ID not found in response${NC}"
  exit 3
fi
echo -e "${GREEN}✅ Program created: $PROGRAM_ID${NC}"

# 3.3: Add project to portfolio
echo "3.3: Adding project to portfolio..."
ADD_PROJECTS_BODY=$(cat <<EOF
{
  "projectIds": ["$PROJECT_ID"]
}
EOF
)

ADD_PROJECTS_RESPONSE=$(api_call "POST" "/api/portfolios/$PORTFOLIO_ID/projects" "$ADD_PROJECTS_BODY" "")
ADD_PROJECTS_STATUS=$(echo "$ADD_PROJECTS_RESPONSE" | cut -d'|' -f1)
ADD_PROJECTS_BODY_RESP=$(echo "$ADD_PROJECTS_RESPONSE" | cut -d'|' -f2)
ADD_PROJECTS_REQUEST_ID=$(echo "$ADD_PROJECTS_RESPONSE" | cut -d'|' -f3)

if [ "$ADD_PROJECTS_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to add project to portfolio ($ADD_PROJECTS_STATUS)${NC}"
  if [ -n "$ADD_PROJECTS_REQUEST_ID" ]; then
    echo "RequestId: $ADD_PROJECTS_REQUEST_ID"
  fi
  echo "$ADD_PROJECTS_BODY_RESP" | jq '.' || echo "$ADD_PROJECTS_BODY_RESP"
  exit 3
fi
echo -e "${GREEN}✅ Project added to portfolio${NC}"

# 3.4: Assign program to project
echo "3.4: Assigning program to project..."
ASSIGN_PROJECT_BODY=$(cat <<EOF
{
  "projectId": "$PROJECT_ID"
}
EOF
)

ASSIGN_RESPONSE=$(api_call "POST" "/api/programs/$PROGRAM_ID/assign-project" "$ASSIGN_PROJECT_BODY" "")
ASSIGN_STATUS=$(echo "$ASSIGN_RESPONSE" | cut -d'|' -f1)
ASSIGN_BODY_RESP=$(echo "$ASSIGN_RESPONSE" | cut -d'|' -f2)
ASSIGN_REQUEST_ID=$(echo "$ASSIGN_RESPONSE" | cut -d'|' -f3)

if [ "$ASSIGN_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to assign program to project ($ASSIGN_STATUS)${NC}"
  if [ -n "$ASSIGN_REQUEST_ID" ];
  then
    echo "RequestId: $ASSIGN_REQUEST_ID"
  fi
  echo "$ASSIGN_BODY_RESP" | jq '.' || echo "$ASSIGN_BODY_RESP"
  exit 3
fi
echo -e "${GREEN}✅ Program assigned to project${NC}"

# 3.5: Call portfolio summary
echo "3.5: Calling portfolio summary..."
START_DATE=$(date -u -v+1d +%Y-%m-%d 2>/dev/null || date -u -d "+1 day" +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)
END_DATE=$(date -u -v+4w +%Y-%m-%d 2>/dev/null || date -u -d "+4 weeks" +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)

PORTFOLIO_SUMMARY_RESPONSE=$(api_call "GET" "/api/portfolios/$PORTFOLIO_ID/summary?startDate=$START_DATE&endDate=$END_DATE" "" "$WORKSPACE_ID")
PORTFOLIO_SUMMARY_STATUS=$(echo "$PORTFOLIO_SUMMARY_RESPONSE" | cut -d'|' -f1)
PORTFOLIO_SUMMARY_BODY=$(echo "$PORTFOLIO_SUMMARY_RESPONSE" | cut -d'|' -f2)
PORTFOLIO_SUMMARY_REQUEST_ID=$(echo "$PORTFOLIO_SUMMARY_RESPONSE" | cut -d'|' -f3)

# Fail fast on 401, 403, 500
if [ "$PORTFOLIO_SUMMARY_STATUS" = "401" ] || [ "$PORTFOLIO_SUMMARY_STATUS" = "403" ] || [ "$PORTFOLIO_SUMMARY_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: Portfolio summary failed with $PORTFOLIO_SUMMARY_STATUS${NC}"
  if [ -n "$PORTFOLIO_SUMMARY_REQUEST_ID" ]; then
    echo "RequestId: $PORTFOLIO_SUMMARY_REQUEST_ID"
  fi
  echo "$PORTFOLIO_SUMMARY_BODY" | jq '.' || echo "$PORTFOLIO_SUMMARY_BODY"
  exit 3
fi

# Check for 404 with route mismatch or "Resource not found"
if [ "$PORTFOLIO_SUMMARY_STATUS" = "404" ]; then
  if echo "$PORTFOLIO_SUMMARY_BODY" | grep -qi "Resource not found\|route mismatch"; then
    echo -e "${RED}❌ ERROR: Portfolio summary route mismatch or resource not found (404)${NC}"
    if [ -n "$PORTFOLIO_SUMMARY_REQUEST_ID" ]; then
      echo "RequestId: $PORTFOLIO_SUMMARY_REQUEST_ID"
    fi
    echo "$PORTFOLIO_SUMMARY_BODY" | jq '.' || echo "$PORTFOLIO_SUMMARY_BODY"
    exit 3
  fi
fi

if [ "$PORTFOLIO_SUMMARY_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to get portfolio summary ($PORTFOLIO_SUMMARY_STATUS)${NC}"
  if [ -n "$PORTFOLIO_SUMMARY_REQUEST_ID" ]; then
    echo "RequestId: $PORTFOLIO_SUMMARY_REQUEST_ID"
  fi
  echo "$PORTFOLIO_SUMMARY_BODY" | jq '.' || echo "$PORTFOLIO_SUMMARY_BODY"
  exit 3
fi

# Validate portfolio summary structure
WEEKS_COUNT=$(echo "$PORTFOLIO_SUMMARY_BODY" | jq -r '.data.weeks | length // 0')
if [ "$WEEKS_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ ERROR: Portfolio summary weeks array is empty${NC}"
  exit 3
fi

HAS_CONFLICTS=$(echo "$PORTFOLIO_SUMMARY_BODY" | jq -r '.data.weeks[0] | has("conflictCount")')
HAS_PROJECT_COUNTS=$(echo "$PORTFOLIO_SUMMARY_BODY" | jq -r 'has("projectCounts")')

if [ "$HAS_CONFLICTS" != "true" ]; then
  echo -e "${RED}❌ ERROR: Portfolio summary missing conflictCount field${NC}"
  exit 3
fi

if [ "$HAS_PROJECT_COUNTS" != "true" ]; then
  echo -e "${RED}❌ ERROR: Portfolio summary missing projectCounts field${NC}"
  exit 3
fi

echo -e "${GREEN}✅ Portfolio summary valid (weeks: $WEEKS_COUNT, conflicts: present, projectCounts: present)${NC}"

# 3.6: Call program summary
echo "3.6: Calling program summary..."
PROGRAM_SUMMARY_RESPONSE=$(api_call "GET" "/api/programs/$PROGRAM_ID/summary?startDate=$START_DATE&endDate=$END_DATE" "" "$WORKSPACE_ID")
PROGRAM_SUMMARY_STATUS=$(echo "$PROGRAM_SUMMARY_RESPONSE" | cut -d'|' -f1)
PROGRAM_SUMMARY_BODY=$(echo "$PROGRAM_SUMMARY_RESPONSE" | cut -d'|' -f2)
PROGRAM_SUMMARY_REQUEST_ID=$(echo "$PROGRAM_SUMMARY_RESPONSE" | cut -d'|' -f3)

# Fail fast on 401, 403, 500
if [ "$PROGRAM_SUMMARY_STATUS" = "401" ] || [ "$PROGRAM_SUMMARY_STATUS" = "403" ] || [ "$PROGRAM_SUMMARY_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: Program summary failed with $PROGRAM_SUMMARY_STATUS${NC}"
  if [ -n "$PROGRAM_SUMMARY_REQUEST_ID" ]; then
    echo "RequestId: $PROGRAM_SUMMARY_REQUEST_ID"
  fi
  echo "$PROGRAM_SUMMARY_BODY" | jq '.' || echo "$PROGRAM_SUMMARY_BODY"
  exit 3
fi

# Check for 404 with route mismatch or "Resource not found"
if [ "$PROGRAM_SUMMARY_STATUS" = "404" ]; then
  if echo "$PROGRAM_SUMMARY_BODY" | grep -qi "Resource not found\|route mismatch"; then
    echo -e "${RED}❌ ERROR: Program summary route mismatch or resource not found (404)${NC}"
    if [ -n "$PROGRAM_SUMMARY_REQUEST_ID" ]; then
      echo "RequestId: $PROGRAM_SUMMARY_REQUEST_ID"
    fi
    echo "$PROGRAM_SUMMARY_BODY" | jq '.' || echo "$PROGRAM_SUMMARY_BODY"
    exit 3
  fi
fi

if [ "$PROGRAM_SUMMARY_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to get program summary ($PROGRAM_SUMMARY_STATUS)${NC}"
  if [ -n "$PROGRAM_SUMMARY_REQUEST_ID" ]; then
    echo "RequestId: $PROGRAM_SUMMARY_REQUEST_ID"
  fi
  echo "$PROGRAM_SUMMARY_BODY" | jq '.' || echo "$PROGRAM_SUMMARY_BODY"
  exit 3
fi

# Validate program summary structure
PROGRAM_WEEKS_COUNT=$(echo "$PROGRAM_SUMMARY_BODY" | jq -r '.data.weeks | length // 0')
if [ "$PROGRAM_WEEKS_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ ERROR: Program summary weeks array is empty${NC}"
  exit 3
fi

PROGRAM_HAS_CONFLICTS=$(echo "$PROGRAM_SUMMARY_BODY" | jq -r '.data.weeks[0] | has("conflictCount")')
PROGRAM_HAS_PROJECT_COUNTS=$(echo "$PROGRAM_SUMMARY_BODY" | jq -r '.data | has("projectCounts")')

if [ "$PROGRAM_HAS_CONFLICTS" != "true" ]; then
  echo -e "${RED}❌ ERROR: Program summary missing conflictCount field${NC}"
  exit 3
fi

if [ "$PROGRAM_HAS_PROJECT_COUNTS" != "true" ]; then
  echo -e "${RED}❌ ERROR: Program summary missing projectCounts field${NC}"
  exit 3
fi

echo -e "${GREEN}✅ Program summary valid (weeks: $PROGRAM_WEEKS_COUNT, conflicts: present, projectCounts: present)${NC}"

echo ""
echo -e "${GREEN}✅ All Phase 4.1 verification tests passed!${NC}"
echo ""
echo "Summary:"
echo "  - Preflight: ✅"
echo "  - ID Discovery: ✅"
echo "  - Portfolio creation: ✅"
echo "  - Program creation: ✅"
echo "  - Add project to portfolio: ✅"
echo "  - Assign program to project: ✅"
echo "  - Portfolio summary: ✅"
echo "  - Program summary: ✅"

exit 0

