#!/usr/bin/env bash
set -euo pipefail

# Runtime proof capture script for Auth and Workspace flows
# Usage: ./run.sh [email] [password]
# If email/password not provided, uses defaults from .env or prompts

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Defaults (should be overridden by args or .env)
EMAIL="${1:-${TEST_EMAIL:-admin@zephix.ai}}"
PASSWORD="${2:-${TEST_PASSWORD:-test123}}"
API_BASE="${API_BASE:-http://localhost:3000/api}"

echo "=== Runtime Proof Capture ==="
echo "Email: $EMAIL"
echo "API Base: $API_BASE"
echo ""

# Step 1: Login
echo "Step 1: Login"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN_RESPONSE" > "$OUT_DIR/01_login_response.txt"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract access token (handle both wrapped and unwrapped responses)
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // .data.accessToken // .token // .data.token // empty' 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "ERROR: Failed to extract access token from login response"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo "Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Step 2: Get current user
echo "Step 2: Get current user (/api/auth/me)"
ME_RESPONSE=$(curl -s -X GET "$API_BASE/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "$ME_RESPONSE" > "$OUT_DIR/02_me_response.txt"
echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"

# Extract user ID and organization ID (handle wrapped responses)
USER_ID=$(echo "$ME_RESPONSE" | jq -r '.user.id // .data.user.id // .data.id // .id // empty' 2>/dev/null || echo "")
ORG_ID=$(echo "$ME_RESPONSE" | jq -r '.user.organizationId // .data.user.organizationId // .data.organizationId // .organizationId // empty' 2>/dev/null || echo "")

echo ""
echo "User ID: $USER_ID"
echo "Organization ID: $ORG_ID"
echo ""

# Step 3: List workspaces
echo "Step 3: List workspaces (/api/workspaces)"
WORKSPACES_RESPONSE=$(curl -s -X GET "$API_BASE/workspaces" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "$WORKSPACES_RESPONSE" > "$OUT_DIR/03_workspaces_response.txt"
echo "$WORKSPACES_RESPONSE" | jq '.' 2>/dev/null || echo "$WORKSPACES_RESPONSE"

# Extract first workspace slug
WORKSPACE_SLUG=$(echo "$WORKSPACES_RESPONSE" | jq -r '.data[0].slug // .data[0].id // .[0].slug // .[0].id // empty' 2>/dev/null || echo "")

if [ -z "$WORKSPACE_SLUG" ]; then
  echo "WARNING: No workspace found. Cannot test workspace home endpoint."
else
  echo ""
  echo "Workspace Slug: $WORKSPACE_SLUG"
  echo ""
  
  # Step 4: Get workspace home by slug
  echo "Step 4: Get workspace home by slug (/api/workspaces/slug/$WORKSPACE_SLUG/home)"
  WORKSPACE_HOME_RESPONSE=$(curl -s -X GET "$API_BASE/workspaces/slug/$WORKSPACE_SLUG/home" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  echo "$WORKSPACE_HOME_RESPONSE" > "$OUT_DIR/04_workspace_home_response.txt"
  echo "$WORKSPACE_HOME_RESPONSE" | jq '.' 2>/dev/null || echo "$WORKSPACE_HOME_RESPONSE"
fi

echo ""
echo "=== Proof Capture Complete ==="
echo "Outputs saved to: $OUT_DIR/"
echo "- 01_login_response.txt"
echo "- 02_me_response.txt"
echo "- 03_workspaces_response.txt"
if [ -n "$WORKSPACE_SLUG" ]; then
  echo "- 04_workspace_home_response.txt"
fi
