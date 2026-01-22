#!/usr/bin/env bash
# Phase 4.2 Context Discovery Script
# Discovers ORG_ID and WORKSPACE_ID via APIs
# Requires: BASE and TOKEN environment variables

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required environment variables
if [ -z "${BASE:-}" ]; then
  echo -e "${RED}❌ ERROR: BASE environment variable is required${NC}" >&2
  exit 1
fi

if [ -z "${TOKEN:-}" ]; then
  echo -e "${RED}❌ ERROR: TOKEN environment variable is required${NC}" >&2
  exit 1
fi

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ ERROR: jq is required but not installed${NC}" >&2
  exit 1
fi

# Discover ORG_ID
echo "Discovering Organization ID..." >&2
ORG_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/organizations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$ORG_RESPONSE" | tail -n1)
ORG_BODY=$(echo "$ORG_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to fetch organizations (HTTP $HTTP_CODE)${NC}" >&2
  echo "$ORG_BODY" | jq '.' 2>/dev/null || echo "$ORG_BODY" >&2
  exit 1
fi

ORG_ID=$(echo "$ORG_BODY" | jq -r '.data[0].id // .data.id // empty')

if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
  echo -e "${RED}❌ ERROR: No organization found${NC}" >&2
  exit 1
fi

# Validate ORG_ID looks like a UUID
if ! echo "$ORG_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
  echo -e "${RED}❌ ERROR: ORG_ID does not look like a valid UUID: $ORG_ID${NC}" >&2
  exit 1
fi

# Discover WORKSPACE_ID
echo "Discovering Workspace ID..." >&2
WS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/workspaces" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$WS_RESPONSE" | tail -n1)
WS_BODY=$(echo "$WS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ ERROR: Failed to fetch workspaces (HTTP $HTTP_CODE)${NC}" >&2
  echo "$WS_BODY" | jq '.' 2>/dev/null || echo "$WS_BODY" >&2
  exit 1
fi

WORKSPACE_ID=$(echo "$WS_BODY" | jq -r '.data[0].id // empty')

if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" = "null" ]; then
  echo -e "${RED}❌ ERROR: No workspace found${NC}" >&2
  exit 1
fi

# Validate WORKSPACE_ID looks like a UUID
if ! echo "$WORKSPACE_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
  echo -e "${RED}❌ ERROR: WORKSPACE_ID does not look like a valid UUID: $WORKSPACE_ID${NC}" >&2
  exit 1
fi

# Export both IDs
export ORG_ID="$ORG_ID"
export WORKSPACE_ID="$WORKSPACE_ID"

echo -e "${GREEN}✅ Context discovered${NC}" >&2
echo "   ORG_ID: $ORG_ID" >&2
echo "   WORKSPACE_ID: $WORKSPACE_ID" >&2


