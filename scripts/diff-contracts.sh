#!/usr/bin/env bash
set -euo pipefail

# Diff expected vs actual API contracts
# Usage: TOKEN=xxx bash scripts/diff-contracts.sh [endpoint]

: "${API:=http://localhost:3000/api}"
: "${TOKEN:?Missing TOKEN - export TOKEN='your-jwt-token'}"

mkdir -p .contracts/{expected,actual}

endpoint="${1:-resources/allocations}"
name=$(basename "$endpoint")

echo "📋 Fetching $endpoint..."

# Fetch actual
curl -sf -H "Authorization: Bearer $TOKEN" "$API/$endpoint" | jq > ".contracts/actual/${name}.json"

# Check if expected exists
if [ ! -f "contracts/${name}.expected.json" ]; then
  echo "⚠️  No expected file at contracts/${name}.expected.json"
  echo "Generated actual to .contracts/actual/${name}.json"
  exit 0
fi

# Diff
if diff -u "contracts/${name}.expected.json" ".contracts/actual/${name}.json"; then
  echo "✅ Contracts match ($endpoint)"
else
  echo "❌ Contract mismatch ($endpoint)"
  exit 1
fi

