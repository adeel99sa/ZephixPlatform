#!/bin/bash
set -e

BASE_URL="${API_URL:-http://localhost:3000}"
TOKEN="${ACCESS_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "❌ ACCESS_TOKEN required"
  echo "Usage: ACCESS_TOKEN=xxx ./scripts/capture-smoke-proof.sh"
  exit 1
fi

OUTPUT_DIR="docs/smoke-proof-artifacts"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📸 Capturing smoke test proof artifacts..."
echo "Base URL: $BASE_URL"
echo "Output directory: $OUTPUT_DIR"
echo ""

# 1. Create connection
echo "1. Creating integration connection..."
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/integrations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "jira",
    "baseUrl": "https://test.atlassian.net",
    "email": "test@example.com",
    "apiToken": "test-token-12345",
    "enabled": true
  }')

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
BODY=$(echo "$CREATE_RESPONSE" | head -n-1)

echo "   HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . > "$OUTPUT_DIR/create-connection-$TIMESTAMP.json" 2>/dev/null || echo "$BODY" > "$OUTPUT_DIR/create-connection-$TIMESTAMP.json"
CONNECTION_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null || echo "")

if [ -z "$CONNECTION_ID" ] || [ "$CONNECTION_ID" == "null" ]; then
  echo "   ⚠️  Could not extract connection ID. Check response:"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  exit 1
fi

echo "   ✅ Connection ID: $CONNECTION_ID"
echo ""

# 2. List connections
echo "2. Listing connections..."
LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/integrations" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
BODY=$(echo "$LIST_RESPONSE" | head -n-1)

echo "   HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . > "$OUTPUT_DIR/list-connections-$TIMESTAMP.json" 2>/dev/null || echo "$BODY" > "$OUTPUT_DIR/list-connections-$TIMESTAMP.json"
echo "   ✅ Saved to list-connections-$TIMESTAMP.json"
echo ""

# 3. Test connection
echo "3. Testing connection..."
TEST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/integrations/$CONNECTION_ID/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$TEST_RESPONSE" | tail -n1)
BODY=$(echo "$TEST_RESPONSE" | head -n-1)

echo "   HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . > "$OUTPUT_DIR/test-connection-$TIMESTAMP.json" 2>/dev/null || echo "$BODY" > "$OUTPUT_DIR/test-connection-$TIMESTAMP.json"
CONNECTED=$(echo "$BODY" | jq -r '.data.connected // "unknown"' 2>/dev/null || echo "unknown")
echo "   ✅ Connected: $CONNECTED"
echo ""

# 4. Sync now (first run)
echo "4. Running sync-now (first run)..."
SYNC1_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/integrations/$CONNECTION_ID/sync-now" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$SYNC1_RESPONSE" | tail -n1)
BODY=$(echo "$SYNC1_RESPONSE" | head -n-1)

echo "   HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . > "$OUTPUT_DIR/sync-now-first-$TIMESTAMP.json" 2>/dev/null || echo "$BODY" > "$OUTPUT_DIR/sync-now-first-$TIMESTAMP.json"
ISSUES1=$(echo "$BODY" | jq -r '.data.issuesProcessed // 0' 2>/dev/null || echo "0")
STATUS1=$(echo "$BODY" | jq -r '.data.status // "unknown"' 2>/dev/null || echo "unknown")
echo "   ✅ Status: $STATUS1, Issues Processed: $ISSUES1"
echo ""

# 5. Sync now (second run - idempotency test)
echo "5. Running sync-now (second run - idempotency test)..."
sleep 2  # Small delay between runs
SYNC2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/integrations/$CONNECTION_ID/sync-now" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$SYNC2_RESPONSE" | tail -n1)
BODY=$(echo "$SYNC2_RESPONSE" | head -n-1)

echo "   HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . > "$OUTPUT_DIR/sync-now-second-$TIMESTAMP.json" 2>/dev/null || echo "$BODY" > "$OUTPUT_DIR/sync-now-second-$TIMESTAMP.json"
ISSUES2=$(echo "$BODY" | jq -r '.data.issuesProcessed // 0' 2>/dev/null || echo "0")
STATUS2=$(echo "$BODY" | jq -r '.data.status // "unknown"' 2>/dev/null || echo "unknown")
echo "   ✅ Status: $STATUS2, Issues Processed: $ISSUES2"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Proof artifacts captured in $OUTPUT_DIR"
echo ""
echo "📊 Summary:"
echo "   Connection ID: $CONNECTION_ID"
echo "   Test Connection: $CONNECTED"
echo "   First Sync: $STATUS1, $ISSUES1 issues processed"
echo "   Second Sync: $STATUS2, $ISSUES2 issues processed"
echo ""
if [ "$ISSUES1" == "$ISSUES2" ]; then
  echo "🔍 Idempotency: ✅ PASS (same count: $ISSUES1)"
else
  echo "🔍 Idempotency: ⚠️  CHECK (first: $ISSUES1, second: $ISSUES2)"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"




