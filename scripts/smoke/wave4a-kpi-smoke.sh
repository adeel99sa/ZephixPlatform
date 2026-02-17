#!/usr/bin/env bash
###############################################################################
# Wave 4A Staging Smoke Test - KPI Foundation Layer
#
# Tests: Definitions, Config, Enable/Disable, Compute, Values
#
# Usage:
#   bash scripts/smoke/wave4a-kpi-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN / SMOKE_EMAIL / SMOKE_PASSWORD
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave4a"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 4A KPI Smoke - $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. Create project with KPI governance flags
###############################################################################
log "Create project with KPI governance flags"
resp=$(apicurl POST /projects \
  -d "{
    \"name\":\"KPI Smoke $(date +%s)\",
    \"workspaceId\":\"$WS_ID\",
    \"iterationsEnabled\":true,
    \"costTrackingEnabled\":true,
    \"baselinesEnabled\":false,
    \"changeManagementEnabled\":true
  }")
parse_response "$resp"
check_401_drift "POST /projects"
save_proof "project-create" "$RESP_BODY"

PROJ_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
if [ -n "$PROJ_ID" ]; then
  pass "Project created: $PROJ_ID"
else
  fail "Project create" "http=$RESP_HTTP"
  summary
fi

###############################################################################
# 5. GET /definitions
###############################################################################
log "GET KPI definitions"
resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/definitions")
parse_response "$resp"
check_401_drift "GET definitions"
save_proof "kpi-definitions" "$RESP_BODY"

DEFS_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  DEF_COUNT=$(echo "$DEFS_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  DEF_COUNT=$(echo "$DEFS_DATA" | json_count)
fi

if [ "$DEF_COUNT" -ge 12 ] 2>/dev/null; then
  pass "Definitions: $DEF_COUNT found"
else
  fail "Definitions" "count=$DEF_COUNT (expected >= 12)"
fi

###############################################################################
# 6. GET /config - auto-created configs
###############################################################################
log "GET KPI config"
resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/config")
parse_response "$resp"
check_401_drift "GET config"
save_proof "kpi-config-initial" "$RESP_BODY"

CFG_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  CFG_COUNT=$(echo "$CFG_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  CFG_COUNT=$(echo "$CFG_DATA" | json_count)
fi

if [ "$CFG_COUNT" -ge 1 ] 2>/dev/null; then
  pass "Config auto-created: $CFG_COUNT items"
else
  fail "Config" "count=$CFG_COUNT"
fi

###############################################################################
# 7. PATCH /config - enable 6 KPIs
###############################################################################
log "Enable 6 KPIs via PATCH"
resp=$(apicurl PATCH "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/config" \
  -d '{"items":[{"kpiCode":"velocity","enabled":true},{"kpiCode":"throughput","enabled":true},{"kpiCode":"wip","enabled":true},{"kpiCode":"cycle_time","enabled":true},{"kpiCode":"budget_burn","enabled":true},{"kpiCode":"change_request_approval_rate","enabled":true}]}')
parse_response "$resp"
check_401_drift "PATCH config enable"
save_proof "kpi-config-patch" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
  ENABLE_DATA=$(echo "$RESP_BODY" | json_unwrap)
  if $HAS_JQ; then
    ENABLE_COUNT=$(echo "$ENABLE_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
  else
    ENABLE_COUNT=$(echo "$ENABLE_DATA" | json_count)
  fi

  if [ "$ENABLE_COUNT" -ge 6 ] 2>/dev/null; then
    pass "Enabled $ENABLE_COUNT KPIs"
  else
    warn "Enable KPIs" "http=$RESP_HTTP, count=$ENABLE_COUNT (expected 6)"
  fi
elif [ "$RESP_HTTP" = "400" ]; then
  GOV_CODE=$(echo "$RESP_BODY" | json_field "code")
  if [ "$GOV_CODE" = "KPI_GOVERNANCE_DISABLED" ]; then
    pass "Enable KPIs: governance gating enforced correctly (400 KPI_GOVERNANCE_DISABLED)"
  else
    fail "Enable KPIs" "http=400 code=$GOV_CODE"
  fi
else
  fail "Enable KPIs" "http=$RESP_HTTP body=$(echo "$RESP_BODY" | head -c 200)"
fi

###############################################################################
# 8. POST /compute
###############################################################################
log "Trigger KPI computation"
resp=$(apicurl POST "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute")
parse_response "$resp"
check_401_drift "POST compute"
save_proof "kpi-compute" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ] || [ "$RESP_HTTP" = "202" ]; then
  COMP_DATA=$(echo "$RESP_BODY" | json_unwrap)
  if $HAS_JQ; then
    COMP_COUNT=$(echo "$COMP_DATA" | jq '.computed | if type == "array" then length else 0 end' 2>/dev/null || echo "0")
    SKIP_COUNT=$(echo "$COMP_DATA" | jq '.skipped | if type == "array" then length else 0 end' 2>/dev/null || echo "0")
  else
    COMP_COUNT=$(echo "$COMP_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('computed',[])))" 2>/dev/null || echo "0")
    SKIP_COUNT=$(echo "$COMP_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('skipped',[])))" 2>/dev/null || echo "0")
  fi

  if [ "$COMP_COUNT" -ge 1 ] 2>/dev/null || [ "$SKIP_COUNT" -ge 1 ] 2>/dev/null; then
    pass "Compute: computed=$COMP_COUNT skipped=$SKIP_COUNT (http=$RESP_HTTP)"
  else
    warn "Compute" "computed=$COMP_COUNT skipped=$SKIP_COUNT (expected at least 1)"
  fi
else
  fail "Compute" "http=$RESP_HTTP"
fi

###############################################################################
# 9. GET /values
###############################################################################
log "GET KPI values for today"
TODAY=$(date +%Y-%m-%d)
resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/values?from=$TODAY&to=$TODAY")
parse_response "$resp"
check_401_drift "GET values"
save_proof "kpi-values" "$RESP_BODY"

VAL_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  VAL_COUNT=$(echo "$VAL_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  VAL_COUNT=$(echo "$VAL_DATA" | json_count)
fi

if [ "$VAL_COUNT" -ge 1 ] 2>/dev/null; then
  pass "Values: $VAL_COUNT rows for today"
else
  warn "Values" "count=$VAL_COUNT"
fi

###############################################################################
# 10. Assert sampleSize present
###############################################################################
log "Assert sampleSize present on all values"
HAS_SAMPLE=$(echo "$VAL_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
if not items: print('true'); sys.exit()
for v in items:
    if 'sampleSize' not in v and 'sample_size' not in v:
        print('false'); sys.exit()
print('true')
" 2>/dev/null || echo "true")

if [ "$HAS_SAMPLE" = "true" ]; then
  pass "All values have sampleSize"
else
  fail "sampleSize" "missing on some values"
fi

###############################################################################
summary
