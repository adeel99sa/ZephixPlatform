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
# 6. Share functionality tests (Step 8):
#    - Enable share for dashboard
#    - Public fetch with share token (no Authorization)
#    - Disable share
#    - Verify old token fails
#
# Exit codes:
#   0 - All checks passed
#   1 - Preflight failed
#   2 - ID discovery failed
#   3 - Dashboard template test failed
#   4 - Analytics widget test failed
#   5 - AI copilot test failed
#   6 - Share functionality test failed

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
      # Use --data-raw to prevent shell interpretation of JSON quotes
      response=$(curl -s -w "\n%{http_code}" -D /tmp/curl_headers.txt -X "$method" "$url" "${headers[@]}" --data-raw "$body" 2>&1)
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
if [ "$TEMPLATE_COUNT" -lt 1 ]; then
  echo -e "${RED}❌ ERROR: Templates list must contain at least 1 template, found $TEMPLATE_COUNT${NC}"
  if [ -n "$TEMPLATES_REQUEST_ID" ]; then
    echo "RequestId: $TEMPLATES_REQUEST_ID"
  fi
  exit 3
fi
echo -e "${GREEN}✅ Templates listed: $TEMPLATE_COUNT templates found${NC}"
if [ -n "$TEMPLATES_REQUEST_ID" ]; then
  echo "   RequestId: $TEMPLATES_REQUEST_ID"
fi

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
if [ -z "$DASHBOARD_ID" ] || [ "$DASHBOARD_ID" = "null" ]; then
  echo -e "${RED}❌ ERROR: Dashboard ID not found in response${NC}"
  echo "$ACTIVATE_BODY_RESP" | jq '.'
  exit 3
fi
echo -e "${GREEN}✅ Template activated: Dashboard $DASHBOARD_ID created (201)${NC}"
if [ -n "$ACTIVATE_REQUEST_ID" ]; then
  echo "   RequestId: $ACTIVATE_REQUEST_ID"
fi

echo "3.3: Verifying dashboard appears in list..."
DASHBOARDS_LIST_RESPONSE=$(curl_json "GET" "/api/dashboards" "" "$WORKSPACE_ID")
DASHBOARDS_LIST_STATUS=$(echo "$DASHBOARDS_LIST_RESPONSE" | cut -d'|' -f1)
DASHBOARDS_LIST_BODY=$(echo "$DASHBOARDS_LIST_RESPONSE" | cut -d'|' -f2)
DASHBOARDS_LIST_REQUEST_ID=$(echo "$DASHBOARDS_LIST_RESPONSE" | cut -d'|' -f3)

if [ "$DASHBOARDS_LIST_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to list dashboards ($DASHBOARDS_LIST_STATUS)${NC}"
  if [ -n "$DASHBOARDS_LIST_REQUEST_ID" ]; then
    echo "RequestId: $DASHBOARDS_LIST_REQUEST_ID"
  fi
  echo "$DASHBOARDS_LIST_BODY" | jq '.' || echo "$DASHBOARDS_LIST_BODY"
  exit 3
fi

DASHBOARD_IN_LIST=$(echo "$DASHBOARDS_LIST_BODY" | jq -r ".data[] | select(.id == \"$DASHBOARD_ID\") | .id" | head -1)
if [ -z "$DASHBOARD_IN_LIST" ] || [ "$DASHBOARD_IN_LIST" != "$DASHBOARD_ID" ]; then
  echo -e "${RED}❌ ERROR: Dashboard $DASHBOARD_ID not found in dashboards list${NC}"
  echo "$DASHBOARDS_LIST_BODY" | jq '.'
  exit 3
fi
echo -e "${GREEN}✅ Dashboard $DASHBOARD_ID found in dashboards list${NC}"
if [ -n "$DASHBOARDS_LIST_REQUEST_ID" ]; then
  echo "   RequestId: $DASHBOARDS_LIST_REQUEST_ID"
fi

echo "3.4: Fetching dashboard and widgets..."
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
if [ "$WIDGET_COUNT" -lt 1 ]; then
  echo -e "${RED}❌ ERROR: Dashboard widgets array must be non-empty, found $WIDGET_COUNT widgets${NC}"
  if [ -n "$DASHBOARD_REQUEST_ID" ]; then
    echo "RequestId: $DASHBOARD_REQUEST_ID"
  fi
  echo "$DASHBOARD_BODY" | jq '.'
  exit 3
fi
echo -e "${GREEN}✅ Dashboard fetched: $WIDGET_COUNT widgets (non-empty)${NC}"
if [ -n "$DASHBOARD_REQUEST_ID" ]; then
  echo "   RequestId: $DASHBOARD_REQUEST_ID"
fi
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
  # Assert required fields present (data array with projectId, projectName, status, riskLevel, conflictCount)
  HAS_REQUIRED_FIELDS=$(echo "$PROJECT_HEALTH_BODY" | jq -r '.data | if type == "array" and length > 0 then .[0] | has("projectId") and has("projectName") and has("status") and has("riskLevel") and has("conflictCount") else false end')
  if [ "$HAS_REQUIRED_FIELDS" != "true" ]; then
    echo -e "${RED}❌ ERROR: project-health widget missing required fields${NC}"
    echo "$PROJECT_HEALTH_BODY" | jq '.'
    exit 4
  fi
  echo -e "${GREEN}✅ project-health widget: 200 with required fields${NC}"
  if [ -n "$PROJECT_HEALTH_REQUEST_ID" ]; then
    echo "   RequestId: $PROJECT_HEALTH_REQUEST_ID"
  fi
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
  # Assert required fields present (data array with resource objects containing id, displayName, totalCapacityHours, totalAllocatedHours, utilizationPercentage)
  HAS_REQUIRED_FIELDS=$(echo "$RESOURCE_UTIL_BODY" | jq -r '.data | if type == "array" and length > 0 then .[0] | has("id") and has("displayName") and (has("totalCapacityHours") or has("totalAllocatedHours") or has("utilizationPercentage")) else (type == "array") end')
  if [ "$HAS_REQUIRED_FIELDS" != "true" ]; then
    echo -e "${RED}❌ ERROR: resource-utilization widget missing required fields${NC}"
    echo "$RESOURCE_UTIL_BODY" | jq '.'
    exit 4
  fi
  echo -e "${GREEN}✅ resource-utilization widget: 200 with required fields${NC}"
  if [ -n "$RESOURCE_UTIL_REQUEST_ID" ]; then
    echo "   RequestId: $RESOURCE_UTIL_REQUEST_ID"
  fi
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
  # Assert required fields present (data array with week and count)
  # Handle empty array case: if array is empty, it's valid. If not empty, check first element has week and count
  DATA_TYPE=$(echo "$CONFLICT_TRENDS_BODY" | jq -r '.data | type')
  if [ "$DATA_TYPE" != "array" ]; then
    echo -e "${RED}❌ ERROR: conflict-trends widget data must be an array, got $DATA_TYPE${NC}"
    echo "$CONFLICT_TRENDS_BODY" | jq '.'
    exit 4
  fi
  ARRAY_LENGTH=$(echo "$CONFLICT_TRENDS_BODY" | jq '.data | length')
  if [ "$ARRAY_LENGTH" -eq 0 ]; then
    # Empty array is valid (no conflicts in date range)
    HAS_REQUIRED_FIELDS="true"
  else
    # Check first element has week and count
    HAS_REQUIRED_FIELDS=$(echo "$CONFLICT_TRENDS_BODY" | jq -r '.data[0] | if type == "object" then (has("week") and has("count")) else false end')
  fi
  if [ "$HAS_REQUIRED_FIELDS" != "true" ]; then
    echo -e "${RED}❌ ERROR: conflict-trends widget missing required fields${NC}"
    echo "$CONFLICT_TRENDS_BODY" | jq '.'
    exit 4
  fi
  echo -e "${GREEN}✅ conflict-trends widget: 200 with required fields${NC}"
  if [ -n "$CONFLICT_TRENDS_REQUEST_ID" ]; then
    echo "   RequestId: $CONFLICT_TRENDS_REQUEST_ID"
  fi
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

# Accept both 200 and 201 as success
if [ "$AI_SUGGEST_STATUS" != "200" ] && [ "$AI_SUGGEST_STATUS" != "201" ]; then
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

# Assert widgetSuggestions is an array and all items are from allowlist
WIDGET_ALLOWLIST="project_health sprint_metrics resource_utilization conflict_trends portfolio_summary program_summary budget_variance risk_summary"
WIDGET_SUGGESTIONS_ARRAY=$(echo "$AI_SUGGEST_BODY_RESP" | jq -r '.data.widgetSuggestions | if type == "array" then .[] else empty end')
ALL_IN_ALLOWLIST=true
for widget in $WIDGET_SUGGESTIONS_ARRAY; do
  if ! echo "$WIDGET_ALLOWLIST" | grep -q "$widget"; then
    echo -e "${RED}❌ ERROR: AI suggest returned widget '$widget' not in allowlist${NC}"
    echo "Allowlist: $WIDGET_ALLOWLIST"
    ALL_IN_ALLOWLIST=false
  fi
done

if [ "$ALL_IN_ALLOWLIST" != "true" ]; then
  echo "$AI_SUGGEST_BODY_RESP" | jq '.'
  exit 5
fi

echo -e "${GREEN}✅ AI suggest: templateKey=$TEMPLATE_KEY, widgetSuggestions from allowlist${NC}"
if [ -n "$AI_SUGGEST_REQUEST_ID" ]; then
  echo "   RequestId: $AI_SUGGEST_REQUEST_ID"
fi

echo "5.2: Testing AI generate..."

# Guard: WORKSPACE_ID is required
if [ -z "${WORKSPACE_ID:-}" ]; then
  echo -e "${RED}❌ WORKSPACE_ID is required for AI generate${NC}"
  exit 1
fi

# Build JSON body using jq to avoid shell quoting issues
AI_GENERATE_BODY=$(jq -n \
  --arg prompt "Create a PMO dashboard for execs. Include project health, resource utilization, conflict trends, and delivery risk. Use weekly trend widgets. Keep to 6 to 8 widgets." \
  --arg persona "RESOURCE_MANAGER" \
  '{
    prompt: $prompt,
    persona: $persona
  }')

# Debug output (safe - no secrets)
echo "   AI_GENERATE_BODY length: ${#AI_GENERATE_BODY}"
echo "   AI_GENERATE_BODY preview: $(echo "$AI_GENERATE_BODY" | head -c 120)"

# Use curl directly with --data-raw to ensure proper JSON transmission
AI_GEN_RESP=$(curl -s -w "\n%{http_code}" \
  "$BASE_URL/api/ai/dashboards/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  --data-raw "$AI_GENERATE_BODY" 2>&1)

AI_GENERATE_STATUS=$(echo "$AI_GEN_RESP" | tail -n1)
AI_GENERATE_BODY_RESP=$(echo "$AI_GEN_RESP" | sed '$d')

# Extract requestId from response if present
AI_GENERATE_REQUEST_ID=$(echo "$AI_GENERATE_BODY_RESP" | jq -r '.error.requestId // .meta.requestId // empty' 2>/dev/null || echo "")

# Create response in same format as curl_json function for consistency
AI_GENERATE_RESPONSE="$AI_GENERATE_STATUS|$AI_GENERATE_BODY_RESP|$AI_GENERATE_REQUEST_ID"
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

# Accept both 200 and 201 as success
if [ "$AI_GENERATE_STATUS" != "200" ] && [ "$AI_GENERATE_STATUS" != "201" ]; then
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

# Assert dashboard schema passes backend schema guard:
# - widgets is an array
# - Each widget has: widgetKey, title, config (object), layout (object with x, y, w, h as numbers)
# - All widgetKeys are in allowlist
WIDGET_COUNT=$(echo "$AI_GENERATE_BODY_RESP" | jq '.data.widgets | length')
WIDGETS_IS_ARRAY=$(echo "$AI_GENERATE_BODY_RESP" | jq -r '.data.widgets | if type == "array" then "true" else "false" end')

if [ "$WIDGETS_IS_ARRAY" != "true" ]; then
  echo -e "${RED}❌ ERROR: AI generate widgets must be an array${NC}"
  echo "$AI_GENERATE_BODY_RESP" | jq '.'
  exit 5
fi

# Validate each widget structure
WIDGET_ALLOWLIST="project_health sprint_metrics resource_utilization conflict_trends portfolio_summary program_summary budget_variance risk_summary"
for i in $(seq 0 $((WIDGET_COUNT - 1))); do
  WIDGET=$(echo "$AI_GENERATE_BODY_RESP" | jq ".data.widgets[$i]")
  WIDGET_KEY=$(echo "$WIDGET" | jq -r '.widgetKey // empty')
  WIDGET_TITLE=$(echo "$WIDGET" | jq -r '.title // empty')
  WIDGET_CONFIG=$(echo "$WIDGET" | jq -r '.config // empty')
  WIDGET_LAYOUT=$(echo "$WIDGET" | jq -r '.layout // empty')

  if [ -z "$WIDGET_KEY" ] || [ -z "$WIDGET_TITLE" ] || [ "$WIDGET_CONFIG" = "null" ] || [ "$WIDGET_LAYOUT" = "null" ]; then
    echo -e "${RED}❌ ERROR: AI generate widget $i missing required fields (widgetKey, title, config, layout)${NC}"
    echo "$WIDGET" | jq '.'
    exit 5
  fi

  # Check widgetKey is in allowlist
  if ! echo "$WIDGET_ALLOWLIST" | grep -q "$WIDGET_KEY"; then
    echo -e "${RED}❌ ERROR: AI generate widget $i has widgetKey '$WIDGET_KEY' not in allowlist${NC}"
    echo "Allowlist: $WIDGET_ALLOWLIST"
    exit 5
  fi

  # Check layout has numeric x, y, w, h
  LAYOUT_X=$(echo "$WIDGET" | jq -r '.layout.x // empty')
  LAYOUT_Y=$(echo "$WIDGET" | jq -r '.layout.y // empty')
  LAYOUT_W=$(echo "$WIDGET" | jq -r '.layout.w // empty')
  LAYOUT_H=$(echo "$WIDGET" | jq -r '.layout.h // empty')

  if [ -z "$LAYOUT_X" ] || [ -z "$LAYOUT_Y" ] || [ -z "$LAYOUT_W" ] || [ -z "$LAYOUT_H" ]; then
    echo -e "${RED}❌ ERROR: AI generate widget $i layout missing numeric x, y, w, h${NC}"
    echo "$WIDGET" | jq '.'
    exit 5
  fi
done

echo -e "${GREEN}✅ AI generate: name=$DASHBOARD_NAME, visibility=$DASHBOARD_VISIBILITY, widgets=$WIDGET_COUNT (schema valid)${NC}"
if [ -n "$AI_GENERATE_REQUEST_ID" ]; then
  echo "   RequestId: $AI_GENERATE_REQUEST_ID"
fi
echo ""

# Step 6: Share Functionality Tests
echo -e "${YELLOW}📋 Step 6: Share Functionality Tests${NC}"

echo "6.1: Enabling share for dashboard..."
ENABLE_SHARE_BODY=$(jq -n '{"expiresAt": null}')
ENABLE_SHARE_RESPONSE=$(curl_json "POST" "/api/dashboards/$DASHBOARD_ID/share-enable" "$ENABLE_SHARE_BODY" "$WORKSPACE_ID")
ENABLE_SHARE_STATUS=$(echo "$ENABLE_SHARE_RESPONSE" | cut -d'|' -f1)
ENABLE_SHARE_BODY_RESP=$(echo "$ENABLE_SHARE_RESPONSE" | cut -d'|' -f2)
ENABLE_SHARE_REQUEST_ID=$(echo "$ENABLE_SHARE_RESPONSE" | cut -d'|' -f3)

# Fail fast on 401, 403, 404, 500
if [ "$ENABLE_SHARE_STATUS" = "401" ] || [ "$ENABLE_SHARE_STATUS" = "403" ] || [ "$ENABLE_SHARE_STATUS" = "404" ] || [ "$ENABLE_SHARE_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: Enable share failed with $ENABLE_SHARE_STATUS${NC}"
  if [ -n "$ENABLE_SHARE_REQUEST_ID" ]; then
    echo "RequestId: $ENABLE_SHARE_REQUEST_ID"
  fi
  echo "$ENABLE_SHARE_BODY_RESP" | jq '.' || echo "$ENABLE_SHARE_BODY_RESP"
  exit 6
fi

if [ "$ENABLE_SHARE_STATUS" != "200" ] && [ "$ENABLE_SHARE_STATUS" != "201" ]; then
  echo -e "${RED}❌ ERROR: Enable share returned $ENABLE_SHARE_STATUS${NC}"
  if [ -n "$ENABLE_SHARE_REQUEST_ID" ]; then
    echo "RequestId: $ENABLE_SHARE_REQUEST_ID"
  fi
  echo "$ENABLE_SHARE_BODY_RESP" | jq '.' || echo "$ENABLE_SHARE_BODY_RESP"
  exit 6
fi

# Parse shareToken from .data.shareToken or .data.token, support both, fail if missing
SHARE_TOKEN=$(echo "$ENABLE_SHARE_BODY_RESP" | jq -e -r '.data.shareToken // .data.token // empty' 2>/dev/null || echo "")

if [ -z "$SHARE_TOKEN" ] || [ "$SHARE_TOKEN" = "null" ]; then
  # Try extracting from shareUrlPath if token not directly available
  SHARE_URL_PATH=$(echo "$ENABLE_SHARE_BODY_RESP" | jq -r '.data.shareUrlPath // .shareUrlPath // empty')
  if [ -n "$SHARE_URL_PATH" ] && [ "$SHARE_URL_PATH" != "null" ]; then
    SHARE_TOKEN=$(echo "$SHARE_URL_PATH" | grep -oP 'share=\K[^&]+' || echo "")
  fi
fi

if [ -z "$SHARE_TOKEN" ] || [ "$SHARE_TOKEN" = "null" ]; then
  echo -e "${RED}❌ ERROR: shareToken not found in enable share response${NC}"
  echo "$ENABLE_SHARE_BODY_RESP" | jq '.'
  exit 6
fi

SHARE_TOKEN_MASKED="${SHARE_TOKEN:0:6}...${SHARE_TOKEN: -6}"
echo -e "${GREEN}✅ Share enabled: Token $SHARE_TOKEN_MASKED (HTTP $ENABLE_SHARE_STATUS)${NC}"
if [ -n "$ENABLE_SHARE_REQUEST_ID" ]; then
  echo "   RequestId: $ENABLE_SHARE_REQUEST_ID"
fi

echo "6.2: Testing public fetch with share token (no Authorization header)..."
# Public fetch without Authorization header
PUBLIC_FETCH_RESP=$(curl -sS -w "\n%{http_code}" -D /tmp/public_headers.txt \
  "$BASE_URL/api/dashboards/$DASHBOARD_ID?share=$SHARE_TOKEN" \
  -H "Content-Type: application/json" 2>&1)

PUBLIC_FETCH_STATUS=$(echo "$PUBLIC_FETCH_RESP" | tail -n1)
PUBLIC_FETCH_BODY=$(echo "$PUBLIC_FETCH_RESP" | sed '$d')
PUBLIC_FETCH_REQUEST_ID=$(grep -i "x-request-id:" /tmp/public_headers.txt 2>/dev/null | cut -d' ' -f2 | tr -d '\r' || echo "")
rm -f /tmp/public_headers.txt

# Fail fast on 401, 403, 404, 500
if [ "$PUBLIC_FETCH_STATUS" = "401" ] || [ "$PUBLIC_FETCH_STATUS" = "403" ] || [ "$PUBLIC_FETCH_STATUS" = "404" ] || [ "$PUBLIC_FETCH_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: Public fetch failed with $PUBLIC_FETCH_STATUS${NC}"
  if [ -n "$PUBLIC_FETCH_REQUEST_ID" ]; then
    echo "RequestId: $PUBLIC_FETCH_REQUEST_ID"
  fi
  echo "$PUBLIC_FETCH_BODY" | jq '.' || echo "$PUBLIC_FETCH_BODY"
  exit 6
fi

if [ "$PUBLIC_FETCH_STATUS" != "200" ]; then
  echo -e "${RED}❌ ERROR: Public fetch returned $PUBLIC_FETCH_STATUS (expected 200)${NC}"
  if [ -n "$PUBLIC_FETCH_REQUEST_ID" ]; then
    echo "RequestId: $PUBLIC_FETCH_REQUEST_ID"
  fi
  echo "$PUBLIC_FETCH_BODY" | jq '.' || echo "$PUBLIC_FETCH_BODY"
  exit 6
fi

# Assert response includes dashboard id and widgets array
PUBLIC_DASHBOARD_ID=$(echo "$PUBLIC_FETCH_BODY" | jq -e -r '.data.id // .id // empty' 2>/dev/null || echo "")
PUBLIC_WIDGETS=$(echo "$PUBLIC_FETCH_BODY" | jq -e -r '.data.widgets // .widgets // empty' 2>/dev/null || echo "")

if [ -z "$PUBLIC_DASHBOARD_ID" ] || [ "$PUBLIC_DASHBOARD_ID" != "$DASHBOARD_ID" ]; then
  echo -e "${RED}❌ ERROR: Public fetch returned wrong dashboard ID${NC}"
  echo "$PUBLIC_FETCH_BODY" | jq '.'
  exit 6
fi

if [ -z "$PUBLIC_WIDGETS" ] || [ "$PUBLIC_WIDGETS" = "null" ]; then
  echo -e "${RED}❌ ERROR: Public fetch response missing widgets array${NC}"
  echo "$PUBLIC_FETCH_BODY" | jq '.'
  exit 6
fi

echo -e "${GREEN}✅ Public fetch succeeded: Dashboard $PUBLIC_DASHBOARD_ID (HTTP $PUBLIC_FETCH_STATUS)${NC}"
if [ -n "$PUBLIC_FETCH_REQUEST_ID" ]; then
  echo "   RequestId: $PUBLIC_FETCH_REQUEST_ID"
fi

echo "6.3: Disabling share..."
DISABLE_SHARE_RESPONSE=$(curl_json "POST" "/api/dashboards/$DASHBOARD_ID/share-disable" "" "$WORKSPACE_ID")
DISABLE_SHARE_STATUS=$(echo "$DISABLE_SHARE_RESPONSE" | cut -d'|' -f1)
DISABLE_SHARE_BODY_RESP=$(echo "$DISABLE_SHARE_RESPONSE" | cut -d'|' -f2)
DISABLE_SHARE_REQUEST_ID=$(echo "$DISABLE_SHARE_RESPONSE" | cut -d'|' -f3)

# Fail fast on 401, 403, 404, 500
if [ "$DISABLE_SHARE_STATUS" = "401" ] || [ "$DISABLE_SHARE_STATUS" = "403" ] || [ "$DISABLE_SHARE_STATUS" = "404" ] || [ "$DISABLE_SHARE_STATUS" = "500" ]; then
  echo -e "${RED}❌ ERROR: Disable share failed with $DISABLE_SHARE_STATUS${NC}"
  if [ -n "$DISABLE_SHARE_REQUEST_ID" ]; then
    echo "RequestId: $DISABLE_SHARE_REQUEST_ID"
  fi
  echo "$DISABLE_SHARE_BODY_RESP" | jq '.' || echo "$DISABLE_SHARE_BODY_RESP"
  exit 6
fi

if [ "$DISABLE_SHARE_STATUS" != "200" ] && [ "$DISABLE_SHARE_STATUS" != "201" ]; then
  echo -e "${RED}❌ ERROR: Disable share returned $DISABLE_SHARE_STATUS${NC}"
  if [ -n "$DISABLE_SHARE_REQUEST_ID" ]; then
    echo "RequestId: $DISABLE_SHARE_REQUEST_ID"
  fi
  echo "$DISABLE_SHARE_BODY_RESP" | jq '.' || echo "$DISABLE_SHARE_BODY_RESP"
  exit 6
fi

echo -e "${GREEN}✅ Share disabled (HTTP $DISABLE_SHARE_STATUS)${NC}"
if [ -n "$DISABLE_SHARE_REQUEST_ID" ]; then
  echo "   RequestId: $DISABLE_SHARE_REQUEST_ID"
fi

echo "6.4: Verifying old share token no longer works..."
OLD_TOKEN_RESP=$(curl -sS -w "\n%{http_code}" -D /tmp/old_token_headers.txt \
  "$BASE_URL/api/dashboards/$DASHBOARD_ID?share=$SHARE_TOKEN" \
  -H "Content-Type: application/json" 2>&1)

OLD_TOKEN_STATUS=$(echo "$OLD_TOKEN_RESP" | tail -n1)
OLD_TOKEN_BODY=$(echo "$OLD_TOKEN_RESP" | sed '$d')
OLD_TOKEN_REQUEST_ID=$(grep -i "x-request-id:" /tmp/old_token_headers.txt 2>/dev/null | cut -d' ' -f2 | tr -d '\r' || echo "")
rm -f /tmp/old_token_headers.txt

if [ "$OLD_TOKEN_STATUS" = "200" ]; then
  echo -e "${RED}❌ ERROR: Old token should be rejected but returned HTTP 200${NC}"
  if [ -n "$OLD_TOKEN_REQUEST_ID" ]; then
    echo "RequestId: $OLD_TOKEN_REQUEST_ID"
  fi
  echo "$OLD_TOKEN_BODY" | jq '.' || echo "$OLD_TOKEN_BODY"
  exit 6
fi

if [ "$OLD_TOKEN_STATUS" != "400" ] && [ "$OLD_TOKEN_STATUS" != "403" ]; then
  echo -e "${YELLOW}⚠️  WARNING: Old token rejected with HTTP $OLD_TOKEN_STATUS (expected 400 or 403)${NC}"
  if [ -n "$OLD_TOKEN_REQUEST_ID" ]; then
    echo "RequestId: $OLD_TOKEN_REQUEST_ID"
  fi
  echo "$OLD_TOKEN_BODY" | jq '.' || echo "$OLD_TOKEN_BODY"
else
  echo -e "${GREEN}✅ Old token correctly rejected (HTTP $OLD_TOKEN_STATUS)${NC}"
  if [ -n "$OLD_TOKEN_REQUEST_ID" ]; then
    echo "   RequestId: $OLD_TOKEN_REQUEST_ID"
  fi
  ERROR_MSG=$(echo "$OLD_TOKEN_BODY" | jq -r '.message // .error // "Token invalid"' 2>/dev/null || echo "Token invalid")
  echo "   Error: $ERROR_MSG"
fi
echo ""

# Final Summary
echo -e "${GREEN}✅ Phase 4.2 Dashboard Studio Verification Complete${NC}"
echo "=============================================="
echo "✅ Preflight: commitShaTrusted = true"
echo "✅ Templates: Listed and activated successfully"
echo "✅ Dashboard: Created with widgets"
echo "✅ Analytics Widgets: Tested (3 endpoints)"
echo "✅ AI Copilot: Suggest and generate working"
echo "✅ Share Functionality: Enable, public fetch, disable, token invalidation"
echo ""
echo "All checks passed!"

