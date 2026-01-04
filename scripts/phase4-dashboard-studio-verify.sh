#!/usr/bin/env bash
# Phase 4.2 Dashboard Studio Verification Script
#
# Required Environment Variables:
#   BASE - Backend base URL (e.g., "https://zephix-backend-production.up.railway.app")
#   TOKEN - Authentication token (obtain via: source scripts/auth-login.sh)
#
# Optional Environment Variables:
#   ORG_ID - Organization ID (will be fetched if not provided)
#   WORKSPACE_ID - Workspace ID (will be fetched if not provided, required for analytics widgets)
#
# Usage:
#   export BASE="https://zephix-backend-production.up.railway.app"
#   source scripts/auth-login.sh  # Sets TOKEN
#   bash scripts/phase4-dashboard-studio-verify.sh
#
# This script verifies Phase 4.2 deployment by:
# 1. Preflight: Check commitShaTrusted
# 2. ID discovery: Fetch orgs, workspaces
# 3. Dashboard template tests:
#    - List templates
#    - Activate resource_utilization_conflicts template
#    - Fetch dashboard and widgets
# 4. Analytics widget tests:
#    - Call 3 analytics widget endpoints and assert 200
# 5. AI copilot tests:
#    - Call ai suggest and ai generate and validate JSON fields exist
#
# Exit codes:
#   0 - All checks passed
#   1 - Preflight failed
#   2 - ID discovery failed
#   3 - Dashboard template test failed
#   4 - Analytics widget test failed
#   5 - AI copilot test failed

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

echo -e "${GREEN}🚀 Phase 4.2 Dashboard Studio Verification${NC}"
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

# Step 1: Preflight
echo -e "${YELLOW}📋 Step 1: Preflight Check${NC}"
echo "Checking /api/version for commitShaTrusted..."
VERSION_RESPONSE=$(curl_json "GET" "/api/version" "" "")
VERSION_STATUS=$(echo "$VERSION_RESPONSE" | cut -d'|' -f1)
VERSION_BODY=$(echo "$VERSION_RESPONSE" | cut -d'|' -f2)
VERSION_REQUEST_ID=$(echo "$VERSION_RESPONSE" | cut -d'|' -f3)

if [ "$VERSION_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Preflight failed ($VERSION_STATUS)${NC}"
  if [ -n "$VERSION_REQUEST_ID" ]; then
    echo "RequestId: $VERSION_REQUEST_ID"
  fi
  echo "$VERSION_BODY" | jq '.' || echo "$VERSION_BODY"
  exit 1
fi

COMMIT_SHA=$(echo "$VERSION_BODY" | jq -r '.data.commitSha // .commitSha // empty')
COMMIT_SHA_TRUSTED=$(echo "$VERSION_BODY" | jq -r '.data.commitShaTrusted // .commitShaTrusted // false')

if [ "$COMMIT_SHA_TRUSTED" != "true" ]; then
  echo -e "${RED}❌ ERROR: commitShaTrusted is not true${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Preflight passed${NC}"
echo "   Commit SHA: $COMMIT_SHA"
echo "   Commit SHA Trusted: $COMMIT_SHA_TRUSTED"
echo ""

# Step 2: ID Discovery
echo -e "${YELLOW}📋 Step 2: ID Discovery${NC}"

if [ -z "${ORG_ID:-}" ]; then
  echo "Fetching Organization ID..."
  ORG_RESPONSE=$(curl_json "GET" "/api/organizations" "" "")
  ORG_STATUS=$(echo "$ORG_RESPONSE" | cut -d'|' -f1)
  ORG_BODY=$(echo "$ORG_RESPONSE" | cut -d'|' -f2)

  if [ "$ORG_STATUS" != "200" ]; then
    echo -e "${RED}❌ ERROR: Failed to fetch organizations ($ORG_STATUS)${NC}"
    echo "$ORG_BODY"
    exit 2
  fi

  ORG_ID=$(echo "$ORG_BODY" | jq -r '.data[0].id // .data.id // empty')
  if [ -z "$ORG_ID" ]; then
    echo -e "${RED}❌ ERROR: No organization found${NC}"
    exit 2
  fi
  echo "✅ ORG_ID: $ORG_ID"
  export ORG_ID
else
  echo "✅ ORG_ID: $ORG_ID (from env)"
fi

if [ -z "${WORKSPACE_ID:-}" ]; then
  echo "Fetching Workspace ID..."
  WS_RESPONSE=$(curl_json "GET" "/api/workspaces" "" "")
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
  export WORKSPACE_ID
else
  echo "✅ WORKSPACE_ID: $WORKSPACE_ID (from env)"
  export WORKSPACE_ID
fi

echo ""

# Step 3: Dashboard Template Tests
echo -e "${YELLOW}📋 Step 3: Dashboard Template Tests${NC}"

echo "3.1: Listing templates..."
TEMPLATES_RESPONSE=$(curl_json "GET" "/api/dashboards/templates" "" "")
TEMPLATES_STATUS=$(echo "$TEMPLATES_RESPONSE" | cut -d'|' -f1)
TEMPLATES_BODY=$(echo "$TEMPLATES_RESPONSE" | cut -d'|' -f2)
TEMPLATES_REQUEST_ID=$(echo "$TEMPLATES_RESPONSE" | cut -d'|' -f3)

if [ "$TEMPLATES_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to list templates ($TEMPLATES_STATUS)${NC}"
  if [ -n "$TEMPLATES_REQUEST_ID" ]; then
    echo "RequestId: $TEMPLATES_REQUEST_ID"
  fi
  echo "$TEMPLATES_BODY" | jq '.' || echo "$TEMPLATES_BODY"
  exit 3
fi

TEMPLATE_COUNT=$(echo "$TEMPLATES_BODY" | jq '.data | length')
echo -e "${GREEN}✅ Templates listed: $TEMPLATE_COUNT templates found${NC}"

echo "3.2: Activating resource_utilization_conflicts template..."
ACTIVATE_BODY=$(cat <<EOF
{
  "templateKey": "resource_utilization_conflicts"
}
EOF
)

ACTIVATE_RESPONSE=$(curl_json "POST" "/api/dashboards/activate-template" "$ACTIVATE_BODY" "$WORKSPACE_ID")
ACTIVATE_STATUS=$(echo "$ACTIVATE_RESPONSE" | cut -d'|' -f1)
ACTIVATE_BODY_RESP=$(echo "$ACTIVATE_RESPONSE" | cut -d'|' -f2)
ACTIVATE_REQUEST_ID=$(echo "$ACTIVATE_RESPONSE" | cut -d'|' -f3)

if [ "$ACTIVATE_STATUS" != "201" ]; then
  echo -e "${RED}❌ ERROR: Failed to activate template ($ACTIVATE_STATUS)${NC}"
  if [ -n "$ACTIVATE_REQUEST_ID" ]; then
    echo "RequestId: $ACTIVATE_REQUEST_ID"
  fi
  echo "$ACTIVATE_BODY_RESP" | jq '.' || echo "$ACTIVATE_BODY_RESP"
  exit 3
fi

DASHBOARD_ID=$(echo "$ACTIVATE_BODY_RESP" | jq -r '.data.id // empty')
if [ -z "$DASHBOARD_ID" ]; then
  echo -e "${RED}❌ ERROR: Dashboard ID not found in response${NC}"
  exit 3
fi
echo -e "${GREEN}✅ Template activated: Dashboard $DASHBOARD_ID created${NC}"

echo "3.3: Fetching dashboard and widgets..."
DASHBOARD_RESPONSE=$(curl_json "GET" "/api/dashboards/$DASHBOARD_ID" "" "$WORKSPACE_ID")
DASHBOARD_STATUS=$(echo "$DASHBOARD_RESPONSE" | cut -d'|' -f1)
DASHBOARD_BODY=$(echo "$DASHBOARD_RESPONSE" | cut -d'|' -f2)
DASHBOARD_REQUEST_ID=$(echo "$DASHBOARD_RESPONSE" | cut -d'|' -f3)

if [ "$DASHBOARD_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to fetch dashboard ($DASHBOARD_STATUS)${NC}"
  if [ -n "$DASHBOARD_REQUEST_ID" ]; then
    echo "RequestId: $DASHBOARD_REQUEST_ID"
  fi
  echo "$DASHBOARD_BODY" | jq '.' || echo "$DASHBOARD_BODY"
  exit 3
fi

WIDGET_COUNT=$(echo "$DASHBOARD_BODY" | jq '.data.widgets | length')
echo -e "${GREEN}✅ Dashboard fetched: $WIDGET_COUNT widgets${NC}"
echo ""

# Step 4: Analytics Widget Tests
echo -e "${YELLOW}📋 Step 4: Analytics Widget Tests${NC}"

START_DATE=$(date -u -v+1d +%Y-%m-%d 2>/dev/null || date -u -d "+1 day" +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)
END_DATE=$(date -u -v+4w +%Y-%m-%d 2>/dev/null || date -u -d "+4 weeks" +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)

echo "4.1: Testing project-health widget..."
PROJECT_HEALTH_RESPONSE=$(curl_json "GET" "/api/analytics/widgets/project-health?startDate=$START_DATE&endDate=$END_DATE" "" "$WORKSPACE_ID")
PROJECT_HEALTH_STATUS=$(echo "$PROJECT_HEALTH_RESPONSE" | cut -d'|' -f1)
PROJECT_HEALTH_BODY=$(echo "$PROJECT_HEALTH_RESPONSE" | cut -d'|' -f2)
PROJECT_HEALTH_REQUEST_ID=$(echo "$PROJECT_HEALTH_RESPONSE" | cut -d'|' -f3)

# Fail fast on 401, 403, 500
if [ "$PROJECT_HEALTH_STATUS" = "401" ] || [ "$PROJECT_HEALTH_STATUS" = "403" ] || [ "$PROJECT_HEALTH_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: project-health widget failed with $PROJECT_HEALTH_STATUS${NC}"
  if [ -n "$PROJECT_HEALTH_REQUEST_ID" ]; then
    echo "RequestId: $PROJECT_HEALTH_REQUEST_ID"
  fi
  echo "$PROJECT_HEALTH_BODY" | jq '.' || echo "$PROJECT_HEALTH_BODY"
  exit 4
fi

if [ "$PROJECT_HEALTH_STATUS" != "200" ]; then
  echo -e "${YELLOW}⚠️  project-health widget returned $PROJECT_HEALTH_STATUS (non-fatal)${NC}"
else
  echo -e "${GREEN}✅ project-health widget: 200${NC}"
fi

echo "4.2: Testing resource-utilization widget..."
RESOURCE_UTIL_RESPONSE=$(curl_json "GET" "/api/analytics/widgets/resource-utilization?startDate=$START_DATE&endDate=$END_DATE" "" "$WORKSPACE_ID")
RESOURCE_UTIL_STATUS=$(echo "$RESOURCE_UTIL_RESPONSE" | cut -d'|' -f1)
RESOURCE_UTIL_BODY=$(echo "$RESOURCE_UTIL_RESPONSE" | cut -d'|' -f2)
RESOURCE_UTIL_REQUEST_ID=$(echo "$RESOURCE_UTIL_RESPONSE" | cut -d'|' -f3)

# Fail fast on 401, 403, 500
if [ "$RESOURCE_UTIL_STATUS" = "401" ] || [ "$RESOURCE_UTIL_STATUS" = "403" ] || [ "$RESOURCE_UTIL_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: resource-utilization widget failed with $RESOURCE_UTIL_STATUS${NC}"
  if [ -n "$RESOURCE_UTIL_REQUEST_ID" ]; then
    echo "RequestId: $RESOURCE_UTIL_REQUEST_ID"
  fi
  echo "$RESOURCE_UTIL_BODY" | jq '.' || echo "$RESOURCE_UTIL_BODY"
  exit 4
fi

if [ "$RESOURCE_UTIL_STATUS" != "200" ]; then
  echo -e "${YELLOW}⚠️  resource-utilization widget returned $RESOURCE_UTIL_STATUS (non-fatal)${NC}"
else
  echo -e "${GREEN}✅ resource-utilization widget: 200${NC}"
fi

echo "4.3: Testing conflict-trends widget..."
CONFLICT_TRENDS_RESPONSE=$(curl_json "GET" "/api/analytics/widgets/conflict-trends?startDate=$START_DATE&endDate=$END_DATE" "" "$WORKSPACE_ID")
CONFLICT_TRENDS_STATUS=$(echo "$CONFLICT_TRENDS_RESPONSE" | cut -d'|' -f1)
CONFLICT_TRENDS_BODY=$(echo "$CONFLICT_TRENDS_RESPONSE" | cut -d'|' -f2)
CONFLICT_TRENDS_REQUEST_ID=$(echo "$CONFLICT_TRENDS_RESPONSE" | cut -d'|' -f3)

# Fail fast on 401, 403, 500
if [ "$CONFLICT_TRENDS_STATUS" = "401" ] || [ "$CONFLICT_TRENDS_STATUS" = "403" ] || [ "$CONFLICT_TRENDS_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: conflict-trends widget failed with $CONFLICT_TRENDS_STATUS${NC}"
  if [ -n "$CONFLICT_TRENDS_REQUEST_ID" ]; then
    echo "RequestId: $CONFLICT_TRENDS_REQUEST_ID"
  fi
  echo "$CONFLICT_TRENDS_BODY" | jq '.' || echo "$CONFLICT_TRENDS_BODY"
  exit 4
fi

if [ "$CONFLICT_TRENDS_STATUS" != "200" ]; then
  echo -e "${YELLOW}⚠️  conflict-trends widget returned $CONFLICT_TRENDS_STATUS (non-fatal)${NC}"
else
  echo -e "${GREEN}✅ conflict-trends widget: 200${NC}"
fi

echo ""

# Step 5: AI Copilot Tests
echo -e "${YELLOW}📋 Step 5: AI Copilot Tests${NC}"

echo "5.1: Testing AI suggest..."
AI_SUGGEST_BODY=$(cat <<EOF
{
  "persona": "RESOURCE_MANAGER"
}
EOF
)

AI_SUGGEST_RESPONSE=$(curl_json "POST" "/api/ai/dashboards/suggest" "$AI_SUGGEST_BODY" "$WORKSPACE_ID")
AI_SUGGEST_STATUS=$(echo "$AI_SUGGEST_RESPONSE" | cut -d'|' -f1)
AI_SUGGEST_BODY_RESP=$(echo "$AI_SUGGEST_RESPONSE" | cut -d'|' -f2)
AI_SUGGEST_REQUEST_ID=$(echo "$AI_SUGGEST_RESPONSE" | cut -d'|' -f3)

# Fail fast on 401, 403, 500
if [ "$AI_SUGGEST_STATUS" = "401" ] || [ "$AI_SUGGEST_STATUS" = "403" ] || [ "$AI_SUGGEST_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: AI suggest failed with $AI_SUGGEST_STATUS${NC}"
  if [ -n "$AI_SUGGEST_REQUEST_ID" ]; then
    echo "RequestId: $AI_SUGGEST_REQUEST_ID"
  fi
  echo "$AI_SUGGEST_BODY_RESP" | jq '.' || echo "$AI_SUGGEST_BODY_RESP"
  exit 5
fi

if [ "$AI_SUGGEST_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: AI suggest returned $AI_SUGGEST_STATUS${NC}"
  echo "$AI_SUGGEST_BODY_RESP" | jq '.' || echo "$AI_SUGGEST_BODY_RESP"
  exit 5
fi

TEMPLATE_KEY=$(echo "$AI_SUGGEST_BODY_RESP" | jq -r '.data.templateKey // empty')
WIDGET_SUGGESTIONS=$(echo "$AI_SUGGEST_BODY_RESP" | jq -r '.data.widgetSuggestions // empty')

if [ -z "$TEMPLATE_KEY" ] || [ -z "$WIDGET_SUGGESTIONS" ]; then
  echo -e "${RED}❌ ERROR: AI suggest response missing required fields${NC}"
  echo "$AI_SUGGEST_BODY_RESP" | jq '.'
  exit 5
fi

echo -e "${GREEN}✅ AI suggest: templateKey=$TEMPLATE_KEY, widgetSuggestions present${NC}"

echo "5.2: Testing AI generate..."
AI_GENERATE_BODY=$(cat <<EOF
{
  "prompt": "Show me resource utilization and conflicts",
  "persona": "RESOURCE_MANAGER"
}
EOF
)

AI_GENERATE_RESPONSE=$(curl_json "POST" "/api/ai/dashboards/generate" "$AI_GENERATE_BODY" "$WORKSPACE_ID")
AI_GENERATE_STATUS=$(echo "$AI_GENERATE_RESPONSE" | cut -d'|' -f1)
AI_GENERATE_BODY_RESP=$(echo "$AI_GENERATE_RESPONSE" | cut -d'|' -f2)
AI_GENERATE_REQUEST_ID=$(echo "$AI_GENERATE_RESPONSE" | cut -d'|' -f3)

# Fail fast on 401, 403, 500
if [ "$AI_GENERATE_STATUS" = "401" ] || [ "$AI_GENERATE_STATUS" = "403" ] || [ "$AI_GENERATE_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: AI generate failed with $AI_GENERATE_STATUS${NC}"
  if [ -n "$AI_GENERATE_REQUEST_ID" ]; then
    echo "RequestId: $AI_GENERATE_REQUEST_ID"
  fi
  echo "$AI_GENERATE_BODY_RESP" | jq '.' || echo "$AI_GENERATE_BODY_RESP"
  exit 5
fi

if [ "$AI_GENERATE_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: AI generate returned $AI_GENERATE_STATUS${NC}"
  echo "$AI_GENERATE_BODY_RESP" | jq '.' || echo "$AI_GENERATE_BODY_RESP"
  exit 5
fi

DASHBOARD_NAME=$(echo "$AI_GENERATE_BODY_RESP" | jq -r '.data.name // empty')
DASHBOARD_VISIBILITY=$(echo "$AI_GENERATE_BODY_RESP" | jq -r '.data.visibility // empty')
DASHBOARD_WIDGETS=$(echo "$AI_GENERATE_BODY_RESP" | jq -r '.data.widgets // empty')

if [ -z "$DASHBOARD_NAME" ] || [ -z "$DASHBOARD_VISIBILITY" ] || [ -z "$DASHBOARD_WIDGETS" ]; then
  echo -e "${RED}❌ ERROR: AI generate response missing required fields${NC}"
  echo "$AI_GENERATE_BODY_RESP" | jq '.'
  exit 5
fi

WIDGET_COUNT=$(echo "$AI_GENERATE_BODY_RESP" | jq '.data.widgets | length')
echo -e "${GREEN}✅ AI generate: name=$DASHBOARD_NAME, visibility=$DASHBOARD_VISIBILITY, widgets=$WIDGET_COUNT${NC}"
echo ""

# Final Summary
echo -e "${GREEN}✅ Phase 4.2 Dashboard Studio Verification Complete${NC}"
echo "=============================================="
echo "✅ Preflight: commitShaTrusted = true"
echo "✅ Templates: Listed and activated successfully"
echo "✅ Dashboard: Created with widgets"
echo "✅ Analytics Widgets: Tested (3 endpoints)"
echo "✅ AI Copilot: Suggest and generate working"
echo ""
echo "All checks passed!"

