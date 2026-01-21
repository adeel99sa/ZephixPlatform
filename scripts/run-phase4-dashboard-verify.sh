#!/usr/bin/env bash
# Phase 4.2 Dashboard Studio Verification Runner
#
# This script discovers ORG_ID and WORKSPACE_ID via APIs, then runs the verification script.
# It ensures all workspace-scoped requests include x-workspace-id header.
#
# Required Environment Variables:
#   BASE - Backend base URL (e.g., "https://zephix-backend-production.up.railway.app")
#   TOKEN - Authentication token (if missing, prints command to obtain it)
#
# Usage:
#   export BASE="https://zephix-backend-production.up.railway.app"
#   export TOKEN="your-auth-token"
#   bash scripts/run-phase4-dashboard-verify.sh
#
# Or with non-interactive auth:
#   export BASE="https://zephix-backend-production.up.railway.app"
#   export EMAIL="your-email@example.com"
#   export PASSWORD="your-password"
#   source scripts/auth-login.sh
#   bash scripts/run-phase4-dashboard-verify.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE:-}"

# Check BASE is set
if [ -z "$BASE_URL" ]; then
  echo -e "${RED}❌ ERROR: BASE environment variable is required${NC}"
  echo "   export BASE=\"https://zephix-backend-production.up.railway.app\""
  exit 1
fi

# Check TOKEN is set
if [ -z "${TOKEN:-}" ]; then
  echo -e "${RED}❌ ERROR: TOKEN environment variable is required${NC}"
  echo ""
  echo "   To get a token, run:"
  echo "   export BASE=\"$BASE_URL\""
  echo "   source scripts/auth-login.sh"
  echo ""
  echo "   Or non-interactive:"
  echo "   export BASE=\"$BASE_URL\""
  echo "   export EMAIL=\"your-email@example.com\""
  echo "   export PASSWORD=\"your-password\""
  echo "   source scripts/auth-login.sh"
  echo ""
  exit 1
fi

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ ERROR: jq is required but not installed${NC}"
  exit 1
fi

echo -e "${GREEN}🚀 Phase 4.2 Dashboard Studio Verification Runner${NC}"
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

  # Fail fast on 401, 403, 404, 500
  if [ "$http_code" = "401" ] || [ "$http_code" = "403" ] || [ "$http_code" = "404" ] || [ "$http_code" = "500" ]; then
    echo -e "${RED}❌ ERROR: Request failed with HTTP $http_code${NC}" >&2
    echo "Endpoint: $method $endpoint" >&2
    echo "Status: $http_code" >&2
    echo "Response body:" >&2
    echo "$body" | jq '.' 2>/dev/null || echo "$body" >&2
    if [ -n "$request_id" ]; then
      echo "RequestId: $request_id" >&2
    fi
    exit 1
  fi

  # Print status and body on other errors
  if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
    echo -e "${RED}❌ HTTP $http_code${NC}" >&2
    echo "$body" | jq '.' 2>/dev/null || echo "$body" >&2
    if [ -n "$request_id" ]; then
      echo -e "${YELLOW}RequestId: $request_id${NC}" >&2
    fi
  fi

  echo "$status|$body|$request_id"
}

# Step 1: Discover ORG_ID
echo -e "${YELLOW}📋 Step 1: Discovering Organization ID${NC}"
ORG_RESPONSE=$(curl_json "GET" "/api/organizations" "" "")
ORG_STATUS=$(echo "$ORG_RESPONSE" | cut -d'|' -f1)
ORG_BODY=$(echo "$ORG_RESPONSE" | cut -d'|' -f2)
ORG_REQUEST_ID=$(echo "$ORG_RESPONSE" | cut -d'|' -f3)

if [ "$ORG_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to fetch organizations ($ORG_STATUS)${NC}"
  if [ -n "$ORG_REQUEST_ID" ]; then
    echo "RequestId: $ORG_REQUEST_ID"
  fi
  echo "$ORG_BODY" | jq '.' || echo "$ORG_BODY"
  exit 1
fi

ORG_ID=$(echo "$ORG_BODY" | jq -r '.data[0].id // .data.id // empty')
if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
  echo -e "${RED}❌ ERROR: No organization found${NC}"
  echo "$ORG_BODY" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Organization ID: $ORG_ID${NC}"
export ORG_ID

# Step 2: Discover WORKSPACE_ID
echo -e "${YELLOW}📋 Step 2: Discovering Workspace ID${NC}"
WS_RESPONSE=$(curl_json "GET" "/api/workspaces" "" "")
WS_STATUS=$(echo "$WS_RESPONSE" | cut -d'|' -f1)
WS_BODY=$(echo "$WS_RESPONSE" | cut -d'|' -f2)
WS_REQUEST_ID=$(echo "$WS_RESPONSE" | cut -d'|' -f3)

if [ "$WS_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to fetch workspaces ($WS_STATUS)${NC}"
  if [ -n "$WS_REQUEST_ID" ]; then
    echo "RequestId: $WS_REQUEST_ID"
  fi
  echo "$WS_BODY" | jq '.' || echo "$WS_BODY"
  exit 1
fi

WORKSPACE_ID=$(echo "$WS_BODY" | jq -r '.data[0].id // empty')
if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" = "null" ]; then
  echo -e "${RED}❌ ERROR: No workspace found${NC}"
  echo "$WS_BODY" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Workspace ID: $WORKSPACE_ID${NC}"
export WORKSPACE_ID

echo ""
echo -e "${GREEN}✅ ID Discovery Complete${NC}"
echo "   ORG_ID: $ORG_ID"
echo "   WORKSPACE_ID: $WORKSPACE_ID"
echo ""

# Step 3: Run verification script
echo -e "${YELLOW}📋 Step 3: Running Phase 4.2 Dashboard Studio Verification${NC}"
echo ""

# Ensure verification script exists
VERIFY_SCRIPT="scripts/phase4-dashboard-studio-verify.sh"
if [ ! -f "$VERIFY_SCRIPT" ]; then
  echo -e "${RED}❌ ERROR: Verification script not found: $VERIFY_SCRIPT${NC}"
  exit 1
fi

# Make sure it's executable
chmod +x "$VERIFY_SCRIPT"

# Run verification script (it will use exported ORG_ID and WORKSPACE_ID)
bash "$VERIFY_SCRIPT"

# Exit with verification script's exit code
exit $?


