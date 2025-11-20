#!/usr/bin/env bash
set -euo pipefail

# Contract smoke test - verifies API returns expected field casing
# Usage: TOKEN=xxx bash scripts/check-contract.sh

: "${API:=http://localhost:3000/api}"
: "${TOKEN:?Missing TOKEN - export TOKEN='your-jwt-token'}"

echo "🔍 Checking allocations contract..."
curl -sf -H "Authorization: Bearer $TOKEN" "$API/resources/allocations" | jq -e '
  if length == 0 then
    # Empty array is OK
    true
  else
    # First item must have snake_case fields from backend
    (.[0] | has("allocation_percentage")) and
    (.[0] | has("user_id")) and
    (.[0] | has("project_id")) and
    (.[0] | has("effective_from"))
  end
' >/dev/null

echo "✅ Allocations contract OK"

