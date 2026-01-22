#!/bin/bash
# Step 8: Backend Share Functionality Smoke Test
# Usage: ./scripts/step8-backend-smoke.sh
#
# Requires:
#   - BASE (backend base URL)
#   - TOKEN (JWT token)
#   - WORKSPACE_ID
#   - DASHBOARD_ID

set -euo pipefail

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo "❌ ERROR: jq is required but not installed"
  exit 1
fi

# Check required environment variables
if [ -z "${BASE:-}" ]; then
  echo "❌ ERROR: BASE environment variable is required"
  exit 1
fi

if [ -z "${TOKEN:-}" ]; then
  echo "❌ ERROR: TOKEN environment variable is required"
  exit 1
fi

if [ -z "${WORKSPACE_ID:-}" ]; then
  echo "❌ ERROR: WORKSPACE_ID environment variable is required"
  exit 1
fi

if [ -z "${DASHBOARD_ID:-}" ]; then
  echo "❌ ERROR: DASHBOARD_ID environment variable is required"
  exit 1
fi

echo "🧪 Step 8 Backend Share Smoke Test"
echo "=================================="
echo "BASE: $BASE"
echo "WORKSPACE_ID: $WORKSPACE_ID"
echo "DASHBOARD_ID: $DASHBOARD_ID"
echo ""

# Helper: Make curl call and capture status + body + requestId
curl_with_status() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local use_auth="${4:-true}"
  
  local headers=(-H "Content-Type: application/json")
  if [ "$use_auth" = "true" ]; then
    headers+=(-H "Authorization: Bearer $TOKEN")
    headers+=(-H "x-workspace-id: $WORKSPACE_ID")
  fi
  
  local temp_body=$(mktemp)
  local temp_headers=$(mktemp)
  
  if [ "$method" = "GET" ]; then
    http_code=$(curl -sS -o "$temp_body" -w "%{http_code}" -D "$temp_headers" "$url" "${headers[@]}" 2>&1)
  else
    if [ -n "$body" ]; then
      http_code=$(curl -sS -o "$temp_body" -w "%{http_code}" -D "$temp_headers" -X "$method" "$url" "${headers[@]}" --data-raw "$body" 2>&1)
    else
      http_code=$(curl -sS -o "$temp_body" -w "%{http_code}" -D "$temp_headers" -X "$method" "$url" "${headers[@]}" 2>&1)
    fi
  fi
  
  response_body=$(cat "$temp_body")
  request_id=$(grep -i "x-request-id:" "$temp_headers" | cut -d' ' -f2 | tr -d '\r' || echo "")
  
  rm -f "$temp_body" "$temp_headers"
  
  echo "$http_code|$response_body|$request_id"
}

# Mask token for display (first 6 and last 6)
mask_token() {
  local token="$1"
  if [ ${#token} -gt 12 ]; then
    echo "${token:0:6}...${token: -6}"
  else
    echo "${token:0:6}..."
  fi
}

# Test 1: Enable share
echo "1️⃣  Enabling share for dashboard..."
ENABLE_RESPONSE=$(curl_with_status "POST" "$BASE/api/dashboards/$DASHBOARD_ID/share-enable" '{"expiresAt":null}' "true")
ENABLE_STATUS=$(echo "$ENABLE_RESPONSE" | cut -d'|' -f1)
ENABLE_BODY=$(echo "$ENABLE_RESPONSE" | cut -d'|' -f2)
ENABLE_REQUEST_ID=$(echo "$ENABLE_RESPONSE" | cut -d'|' -f3)

if [ "$ENABLE_STATUS" != "201" ] && [ "$ENABLE_STATUS" != "200" ]; then
  echo "❌ ERROR: Enable share failed with HTTP $ENABLE_STATUS"
  if [ -n "$ENABLE_REQUEST_ID" ]; then
    echo "RequestId: $ENABLE_REQUEST_ID"
  fi
  echo "$ENABLE_BODY" | jq '.' || echo "$ENABLE_BODY"
  exit 1
fi

# Parse shareToken from .data.shareToken or .data.token
SHARE_TOKEN=$(echo "$ENABLE_BODY" | jq -e -r '.data.shareToken // .data.token // empty' 2>/dev/null || echo "")

if [ -z "$SHARE_TOKEN" ] || [ "$SHARE_TOKEN" = "null" ]; then
  # Try extracting from shareUrlPath if token not directly available
  SHARE_URL_PATH=$(echo "$ENABLE_BODY" | jq -r '.data.shareUrlPath // .shareUrlPath // empty')
  if [ -n "$SHARE_URL_PATH" ] && [ "$SHARE_URL_PATH" != "null" ]; then
    SHARE_TOKEN=$(echo "$SHARE_URL_PATH" | grep -oP 'share=\K[^&]+' || echo "")
  fi
fi

if [ -z "$SHARE_TOKEN" ] || [ "$SHARE_TOKEN" = "null" ]; then
  echo "❌ ERROR: Failed to extract shareToken from response"
  echo "$ENABLE_BODY" | jq '.'
  exit 1
fi

SHARE_TOKEN_MASKED=$(mask_token "$SHARE_TOKEN")
echo "✅ Share enabled (HTTP $ENABLE_STATUS)"
echo "   ShareToken: $SHARE_TOKEN_MASKED"
if [ -n "$ENABLE_REQUEST_ID" ]; then
  echo "   RequestId: $ENABLE_REQUEST_ID"
fi
echo ""

# Test 2: Public fetch without Authorization
echo "2️⃣  Testing public fetch with share token (no Authorization header)..."
PUBLIC_RESPONSE=$(curl_with_status "GET" "$BASE/api/dashboards/$DASHBOARD_ID?share=$SHARE_TOKEN" "" "false")
PUBLIC_STATUS=$(echo "$PUBLIC_RESPONSE" | cut -d'|' -f1)
PUBLIC_BODY=$(echo "$PUBLIC_RESPONSE" | cut -d'|' -f2)
PUBLIC_REQUEST_ID=$(echo "$PUBLIC_RESPONSE" | cut -d'|' -f3)

if [ "$PUBLIC_STATUS" != "200" ]; then
  echo "❌ ERROR: Public fetch failed with HTTP $PUBLIC_STATUS"
  if [ -n "$PUBLIC_REQUEST_ID" ]; then
    echo "RequestId: $PUBLIC_REQUEST_ID"
  fi
  echo "$PUBLIC_BODY" | jq '.' || echo "$PUBLIC_BODY"
  exit 1
fi

# Assert response includes dashboard id and widgets array
DASHBOARD_ID_IN_RESPONSE=$(echo "$PUBLIC_BODY" | jq -e -r '.data.id // .id // empty' 2>/dev/null || echo "")
WIDGETS_ARRAY=$(echo "$PUBLIC_BODY" | jq -e -r '.data.widgets // .widgets // empty' 2>/dev/null || echo "")

if [ -z "$DASHBOARD_ID_IN_RESPONSE" ] || [ "$DASHBOARD_ID_IN_RESPONSE" != "$DASHBOARD_ID" ]; then
  echo "❌ ERROR: Public fetch returned wrong dashboard ID"
  echo "$PUBLIC_BODY" | jq '.'
  exit 1
fi

if [ -z "$WIDGETS_ARRAY" ] || [ "$WIDGETS_ARRAY" = "null" ]; then
  echo "❌ ERROR: Public fetch response missing widgets array"
  echo "$PUBLIC_BODY" | jq '.'
  exit 1
fi

echo "✅ Public fetch succeeded (HTTP $PUBLIC_STATUS)"
echo "   Dashboard ID: $DASHBOARD_ID_IN_RESPONSE"
if [ -n "$PUBLIC_REQUEST_ID" ]; then
  echo "   RequestId: $PUBLIC_REQUEST_ID"
fi
echo ""

# Test 3: Disable share
echo "3️⃣  Disabling share..."
DISABLE_RESPONSE=$(curl_with_status "POST" "$BASE/api/dashboards/$DASHBOARD_ID/share-disable" "" "true")
DISABLE_STATUS=$(echo "$DISABLE_RESPONSE" | cut -d'|' -f1)
DISABLE_BODY=$(echo "$DISABLE_RESPONSE" | cut -d'|' -f2)
DISABLE_REQUEST_ID=$(echo "$DISABLE_RESPONSE" | cut -d'|' -f3)

if [ "$DISABLE_STATUS" != "201" ] && [ "$DISABLE_STATUS" != "200" ]; then
  echo "❌ ERROR: Disable share failed with HTTP $DISABLE_STATUS"
  if [ -n "$DISABLE_REQUEST_ID" ]; then
    echo "RequestId: $DISABLE_REQUEST_ID"
  fi
  echo "$DISABLE_BODY" | jq '.' || echo "$DISABLE_BODY"
  exit 1
fi

echo "✅ Share disabled (HTTP $DISABLE_STATUS)"
if [ -n "$DISABLE_REQUEST_ID" ]; then
  echo "   RequestId: $DISABLE_REQUEST_ID"
fi
echo ""

# Test 4: Verify old token fails
echo "4️⃣  Verifying old token no longer works..."
OLD_TOKEN_RESPONSE=$(curl_with_status "GET" "$BASE/api/dashboards/$DASHBOARD_ID?share=$SHARE_TOKEN" "" "false")
OLD_TOKEN_STATUS=$(echo "$OLD_TOKEN_RESPONSE" | cut -d'|' -f1)
OLD_TOKEN_BODY=$(echo "$OLD_TOKEN_RESPONSE" | cut -d'|' -f2)
OLD_TOKEN_REQUEST_ID=$(echo "$OLD_TOKEN_RESPONSE" | cut -d'|' -f3)

if [ "$OLD_TOKEN_STATUS" = "200" ]; then
  echo "❌ ERROR: Old token should be rejected but returned HTTP 200"
  if [ -n "$OLD_TOKEN_REQUEST_ID" ]; then
    echo "RequestId: $OLD_TOKEN_REQUEST_ID"
  fi
  echo "$OLD_TOKEN_BODY" | jq '.' || echo "$OLD_TOKEN_BODY"
  exit 1
fi

if [ "$OLD_TOKEN_STATUS" != "400" ] && [ "$OLD_TOKEN_STATUS" != "403" ]; then
  echo "⚠️  WARNING: Old token rejected with HTTP $OLD_TOKEN_STATUS (expected 400 or 403)"
  if [ -n "$OLD_TOKEN_REQUEST_ID" ]; then
    echo "RequestId: $OLD_TOKEN_REQUEST_ID"
  fi
  echo "$OLD_TOKEN_BODY" | jq '.' || echo "$OLD_TOKEN_BODY"
else
  echo "✅ Old token correctly rejected (HTTP $OLD_TOKEN_STATUS)"
  if [ -n "$OLD_TOKEN_REQUEST_ID" ]; then
    echo "   RequestId: $OLD_TOKEN_REQUEST_ID"
  fi
  ERROR_MSG=$(echo "$OLD_TOKEN_BODY" | jq -r '.message // .error // "Token invalid"' 2>/dev/null || echo "Token invalid")
  echo "   Error: $ERROR_MSG"
fi
echo ""

echo "✅ All backend share tests passed!"

