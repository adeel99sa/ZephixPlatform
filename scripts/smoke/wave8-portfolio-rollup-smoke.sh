#!/usr/bin/env bash
set -euo pipefail

# Wave 8: Portfolio KPI Rollup Smoke Test
# Prerequisites:
#   - STAGING_URL set (e.g. https://zephix-backend-v2-staging.up.railway.app)
#   - AUTH_TOKEN set (valid JWT)
#   - WORKSPACE_ID set
#   - PORTFOLIO_ID set (an existing portfolio with projects)

BASE="${STAGING_URL:-http://localhost:3000}/api"
TOKEN="${AUTH_TOKEN:?AUTH_TOKEN required}"
WS="${WORKSPACE_ID:?WORKSPACE_ID required}"
PF="${PORTFOLIO_ID:?PORTFOLIO_ID required}"

echo "=== Wave 8 Portfolio KPI Rollup Smoke ==="
echo "Base: $BASE"
echo "Workspace: $WS"
echo "Portfolio: $PF"
echo ""

# Step 1: Health check
echo "--- Step 1: Health check ---"
curl -sf "$BASE/health/ready" | jq .
echo ""

# Step 2: Identity check
echo "--- Step 2: Identity check ---"
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE/system/identity" | jq .
echo ""

# Step 3: List portfolios
echo "--- Step 3: List portfolios ---"
curl -sf -H "Authorization: Bearer $TOKEN" \
  "$BASE/workspaces/$WS/portfolios" | jq '.data | length'
echo ""

# Step 4: Portfolio KPI Rollup
echo "--- Step 4: Portfolio KPI Rollup ---"
ROLLUP=$(curl -sf -H "Authorization: Bearer $TOKEN" \
  "$BASE/workspaces/$WS/portfolios/$PF/kpis/rollup?asOf=$(date +%Y-%m-%d)")
echo "$ROLLUP" | jq .
echo ""

# Step 5: Verify deterministic ordering
echo "--- Step 5: Verify deterministic ordering ---"
COMPUTED_CODES=$(echo "$ROLLUP" | jq -r '.data.computed[].kpiCode' 2>/dev/null || echo "")
SORTED_CODES=$(echo "$COMPUTED_CODES" | sort)
if [ "$COMPUTED_CODES" = "$SORTED_CODES" ]; then
  echo "PASS: computed array is sorted by kpiCode"
else
  echo "FAIL: computed array is NOT sorted"
fi

SKIPPED_CODES=$(echo "$ROLLUP" | jq -r '.data.skipped[].kpiCode' 2>/dev/null || echo "")
SORTED_SKIPPED=$(echo "$SKIPPED_CODES" | sort)
if [ "$SKIPPED_CODES" = "$SORTED_SKIPPED" ]; then
  echo "PASS: skipped array is sorted by kpiCode"
else
  echo "FAIL: skipped array is NOT sorted"
fi
echo ""

# Step 6: Verify engineVersion and inputHash
echo "--- Step 6: Verify metadata ---"
ENGINE=$(echo "$ROLLUP" | jq -r '.data.engineVersion' 2>/dev/null || echo "")
HASH=$(echo "$ROLLUP" | jq -r '.data.inputHash' 2>/dev/null || echo "")
echo "engineVersion: $ENGINE"
echo "inputHash: $HASH (length: ${#HASH})"
if [ ${#HASH} -eq 16 ]; then
  echo "PASS: inputHash length = 16"
else
  echo "FAIL: inputHash length != 16"
fi
echo ""

# Step 7: Check skipped reasons include governance flag names
echo "--- Step 7: Check skipped reasons ---"
echo "$ROLLUP" | jq '.data.skipped[] | {kpiCode, reason, governanceFlag}' 2>/dev/null || echo "No skipped KPIs"
echo ""

# Step 8: Check sources
echo "--- Step 8: Sources ---"
echo "$ROLLUP" | jq '.data.sources' 2>/dev/null || echo "No sources"
echo ""

echo "=== Wave 8 Portfolio KPI Rollup Smoke Complete ==="
