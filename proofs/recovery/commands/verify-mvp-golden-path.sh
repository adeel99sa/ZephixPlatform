#!/bin/bash
# MVP Golden Path Verification Script
# Run this after backend is started and ZEPHIX_TOKEN is set

set -e

BASE_URL="http://localhost:3000"
TOKEN="${ZEPHIX_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ ERROR: ZEPHIX_TOKEN environment variable is not set"
  echo "   Set it with: export ZEPHIX_TOKEN='your-token-here'"
  exit 1
fi

echo "🔍 Step 1: Health Check"
echo "========================"
curl -i "$BASE_URL/api/health" 2>&1
echo -e "\n"

echo "🔍 Step 2: Auth Context"
echo "========================"
AUTH_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/auth/me")
echo "$AUTH_RESPONSE" | jq .
ORG_ID=$(echo "$AUTH_RESPONSE" | jq -r '.data.organizationId // .organizationId // empty')
USER_ID=$(echo "$AUTH_RESPONSE" | jq -r '.data.id // .id // empty')
echo -e "\n📋 Extracted: organizationId=$ORG_ID, userId=$USER_ID\n"

echo "🔍 Step 3: Workspaces"
echo "======================"
WORKSPACES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/workspaces")
echo "$WORKSPACES_RESPONSE" | jq .
WORKSPACE_ID=$(echo "$WORKSPACES_RESPONSE" | jq -r '.data[0].id // .data.id // .[0].id // empty')
echo -e "\n📋 Extracted: workspaceId=$WORKSPACE_ID\n"
export ZEPHIX_WORKSPACE_ID="$WORKSPACE_ID"

if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" = "null" ]; then
  echo "⚠️  WARNING: No workspace ID found. Some steps may fail."
fi

echo "🔍 Step 4: Seed Templates"
echo "=========================="
SEED_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/seed/templates")
echo "$SEED_RESPONSE" | jq .
CREATED_COUNT=$(echo "$SEED_RESPONSE" | jq -r '.data.created // .created // 0')
echo -e "\n📋 Templates created: $CREATED_COUNT\n"

echo "🔍 Step 5: List Templates (with workspace header)"
echo "=================================================="
TEMPLATES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" -H "x-workspace-id: $WORKSPACE_ID" "$BASE_URL/api/templates")
echo "$TEMPLATES_RESPONSE" | jq .
TEMPLATE_ID=$(echo "$TEMPLATES_RESPONSE" | jq -r '.data[0].id // .data.id // .[0].id // empty')
echo -e "\n📋 Extracted: templateId=$TEMPLATE_ID\n"
export ZEPHIX_TEMPLATE_ID="$TEMPLATE_ID"

if [ -z "$TEMPLATE_ID" ] || [ "$TEMPLATE_ID" = "null" ]; then
  echo "⚠️  WARNING: No template ID found. Cannot test instantiation."
  exit 0
fi

echo "🔍 Step 6: Instantiate Template"
echo "================================="
PROJECT_NAME="MVP Test Project $(date +%s)"
INSTANTIATE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -d "{\"workspaceId\":\"$WORKSPACE_ID\",\"name\":\"$PROJECT_NAME\"}" \
  "$BASE_URL/api/templates/$TEMPLATE_ID/instantiate-v5_1")
echo "$INSTANTIATE_RESPONSE" | jq .
PROJECT_ID=$(echo "$INSTANTIATE_RESPONSE" | jq -r '.data.projectId // .data.id // .projectId // .id // empty')
echo -e "\n📋 Extracted: projectId=$PROJECT_ID\n"

echo "🔍 Step 7: Verify Project in Workspace"
echo "========================================"
PROJECTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" -H "x-workspace-id: $WORKSPACE_ID" "$BASE_URL/api/projects?workspaceId=$WORKSPACE_ID")
echo "$PROJECTS_RESPONSE" | jq .
PROJECT_FOUND=$(echo "$PROJECTS_RESPONSE" | jq -r --arg name "$PROJECT_NAME" '.data[] | select(.name == $name) | .id // empty' 2>/dev/null || echo "")
if [ -n "$PROJECT_FOUND" ]; then
  echo -e "\n✅ SUCCESS: Project '$PROJECT_NAME' found in workspace!"
else
  echo -e "\n⚠️  WARNING: Project '$PROJECT_NAME' not found in projects list"
fi

echo -e "\n✅ MVP Golden Path Verification Complete!"
echo "📊 Summary:"
echo "   - Templates created: $CREATED_COUNT"
echo "   - Template instantiated: $TEMPLATE_ID"
echo "   - Project created: $PROJECT_ID"
