#!/usr/bin/env bash
set -euo pipefail

# Contract check for projects KPI endpoint
# Verifies the endpoint exists and returns expected shape: { data: { count: number } }

echo "🔍 Checking KPI contract..."

: "${API:=http://localhost:3000/api}"
: "${TOKEN:?Missing TOKEN}"
: "${WS_ID:?Missing WS_ID}"

resp=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/projects/stats/by-workspace/$WS_ID" || echo '{}')

if echo "$resp" | jq -e '.data.count | type=="number"' >/dev/null; then
  echo "✅ KPI contract ok"
  exit 0
else
  echo "❌ KPI contract invalid:"
  echo "$resp" | jq .
  exit 1
fi

