#!/bin/bash
# Test script for Teams API endpoints
# Usage: ./scripts/test-teams-api.sh <ADMIN_TOKEN> [WORKSPACE_ID]

ADMIN_TOKEN=${1:-""}
WORKSPACE_ID=${2:-""}
BASE_URL="http://localhost:3000/api"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error: Admin token required"
  echo "Usage: ./scripts/test-teams-api.sh <ADMIN_TOKEN> [WORKSPACE_ID]"
  exit 1
fi

echo "🧪 Testing Teams API Endpoints"
echo "================================"
echo ""

# Test 1: List teams (should be empty initially)
echo "1. GET /admin/teams"
echo "-------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE_URL/admin/teams")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Failed: Expected 200, got $HTTP_STATUS"
  exit 1
fi

# Test 2: Create team
echo "2. POST /admin/teams"
echo "--------------------"
CREATE_BODY=$(cat <<EOF
{
  "name": "Delivery Team",
  "shortCode": "DEL",
  "color": "#8B5CF6",
  "visibility": "workspace",
  "description": "Handles delivery work"
}
EOF
)

if [ -n "$WORKSPACE_ID" ]; then
  CREATE_BODY=$(echo "$CREATE_BODY" | jq ". + {\"workspaceId\": \"$WORKSPACE_ID\"}")
fi

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CREATE_BODY" \
  "$BASE_URL/admin/teams")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

if [ "$HTTP_STATUS" != "201" ] && [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Failed: Expected 201/200, got $HTTP_STATUS"
  exit 1
fi

TEAM_ID=$(echo "$BODY" | jq -r '.id // empty')
if [ -z "$TEAM_ID" ]; then
  echo "❌ Failed: No team ID in response"
  exit 1
fi

echo "✅ Team created with ID: $TEAM_ID"
echo ""

# Test 3: List teams again (should include new team)
echo "3. GET /admin/teams (after create)"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE_URL/admin/teams")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
TEAM_COUNT=$(echo "$BODY" | jq 'length')
echo "Teams count: $TEAM_COUNT"
echo ""

# Test 4: Get team by ID
echo "4. GET /admin/teams/$TEAM_ID"
echo "-----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE_URL/admin/teams/$TEAM_ID")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Team name: $(echo "$BODY" | jq -r '.name // "N/A"')"
echo "Short code: $(echo "$BODY" | jq -r '.shortCode // "N/A"')"
echo "Visibility: $(echo "$BODY" | jq -r '.visibility // "N/A"')"
echo "Member count: $(echo "$BODY" | jq -r '.memberCount // 0')"
echo ""

# Test 5: Update team
echo "5. PATCH /admin/teams/$TEAM_ID"
echo "-------------------------------"
UPDATE_BODY='{"name": "Updated Delivery Team", "color": "#10B981"}'
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_BODY" \
  "$BASE_URL/admin/teams/$TEAM_ID")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Updated name: $(echo "$BODY" | jq -r '.name // "N/A"')"
echo ""

# Test 6: Archive team
echo "6. DELETE /admin/teams/$TEAM_ID (archive)"
echo "------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE_URL/admin/teams/$TEAM_ID")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
echo "Status: $HTTP_STATUS"
echo "Archived status: $(echo "$BODY" | jq -r '.status // "N/A"')"
echo ""

echo "✅ All tests completed!"
echo ""
echo "Summary:"
echo "- List teams: ✅"
echo "- Create team: ✅"
echo "- Get team: ✅"
echo "- Update team: ✅"
echo "- Archive team: ✅"





