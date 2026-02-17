#!/usr/bin/env bash
###############################################################################
# Wave 4C Staging Smoke Test — KPI UI Endpoints (API-only)
#
# Tests: Global KPI definitions, admin template KPI management,
#        project KPI configs, compute with governance gating.
#
# UI checks are DEFERRED TO MANUAL — this script covers API contracts only.
#
# Usage:
#   bash scripts/smoke/wave4c-kpi-ui-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN / SMOKE_EMAIL / SMOKE_PASSWORD
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave4c"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 4C KPI UI Smoke (API) — $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. GET /kpis/definitions — global definitions endpoint
###############################################################################
log "GET /kpis/definitions (global)"
resp=$(apicurl GET /kpis/definitions)
parse_response "$resp"
check_401_drift "GET /kpis/definitions"
save_proof "kpi-definitions-global" "$RESP_BODY"

DEFS_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  DEF_COUNT=$(echo "$DEFS_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  DEF_COUNT=$(echo "$DEFS_DATA" | json_count)
fi

if [ "$DEF_COUNT" -ge 12 ] 2>/dev/null; then
  pass "Global KPI definitions: $DEF_COUNT (>= 12)"
else
  fail "Global KPI definitions" "count=$DEF_COUNT (expected >= 12)"
fi

###############################################################################
# 5. Create a template and assign 2 KPIs
###############################################################################
log "Create template for KPI binding test"
resp=$(apicurl POST /templates \
  -d "{\"name\":\"Wave4C KPI Test $(date +%s)\"}")
parse_response "$resp"
check_401_drift "POST /admin/templates (create)"
save_proof "template-create" "$RESP_BODY"

TPL_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
if [ -n "$TPL_ID" ]; then
  pass "Template created: $TPL_ID"
else
  fail "Template create" "http=$RESP_HTTP"
  summary
fi

# Get first two KPI definition IDs
if $HAS_JQ; then
  KPI_ID_1=$(echo "$DEFS_DATA" | jq -r '.[0].id // empty' 2>/dev/null)
  KPI_ID_2=$(echo "$DEFS_DATA" | jq -r '.[1].id // empty' 2>/dev/null)
else
  KPI_ID_1=$(echo "$DEFS_DATA" | python3 -c "
import sys,json; d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
print(items[0]['id'] if len(items)>0 else '')
" 2>/dev/null || echo "")
  KPI_ID_2=$(echo "$DEFS_DATA" | python3 -c "
import sys,json; d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
print(items[1]['id'] if len(items)>1 else '')
" 2>/dev/null || echo "")
fi

log "Assign KPI 1 (required): $KPI_ID_1"
resp=$(apicurl POST "/admin/templates/${TPL_ID}/kpis" \
  -d "{\"kpiDefinitionId\":\"$KPI_ID_1\",\"isRequired\":true,\"defaultTarget\":\"95\"}")
parse_response "$resp"
check_401_drift "POST assign KPI 1"
save_proof "kpi-assign-1" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
  pass "KPI 1 assigned (required)"
else
  fail "KPI 1 assign" "http=$RESP_HTTP"
fi

log "Assign KPI 2 (optional): $KPI_ID_2"
resp=$(apicurl POST "/admin/templates/${TPL_ID}/kpis" \
  -d "{\"kpiDefinitionId\":\"$KPI_ID_2\",\"isRequired\":false}")
parse_response "$resp"
check_401_drift "POST assign KPI 2"
save_proof "kpi-assign-2" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
  pass "KPI 2 assigned (optional)"
else
  fail "KPI 2 assign" "http=$RESP_HTTP"
fi

###############################################################################
# 6. GET /admin/templates/:id/kpis — verify 2 bindings
###############################################################################
log "GET template KPIs"
resp=$(apicurl GET "/admin/templates/${TPL_ID}/kpis")
parse_response "$resp"
check_401_drift "GET template KPIs"
save_proof "template-kpis-list" "$RESP_BODY"

TKPIS_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  TKPI_COUNT=$(echo "$TKPIS_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  TKPI_COUNT=$(echo "$TKPIS_DATA" | json_count)
fi

if [ "$TKPI_COUNT" -eq 2 ] 2>/dev/null; then
  pass "Template KPIs: $TKPI_COUNT bindings"
elif [ "$TKPI_COUNT" -ge 2 ] 2>/dev/null; then
  pass "Template KPIs: $TKPI_COUNT bindings (>= 2)"
else
  fail "Template KPIs" "count=$TKPI_COUNT (expected 2)"
fi

###############################################################################
# 7. Create project and verify KPI configs populated
###############################################################################
log "Create project from template"
resp=$(apicurl POST "/admin/templates/${TPL_ID}/apply" \
  -d "{\"name\":\"Wave4C Proj $(date +%s)\",\"workspaceId\":\"$WS_ID\"}")
parse_response "$resp"
check_401_drift "POST apply template"
save_proof "project-create" "$RESP_BODY"

PROJ_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
if [ -n "$PROJ_ID" ]; then
  pass "Project created: $PROJ_ID"
else
  fail "Project create" "http=$RESP_HTTP"
fi

if [ -n "$PROJ_ID" ]; then
  log "Verify project KPI configs"
  resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/config")
  parse_response "$resp"
  check_401_drift "GET project kpi config"
  save_proof "project-kpi-configs" "$RESP_BODY"

  CFG_DATA=$(echo "$RESP_BODY" | json_unwrap)
  if $HAS_JQ; then
    CFG_COUNT=$(echo "$CFG_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
  else
    CFG_COUNT=$(echo "$CFG_DATA" | json_count)
  fi

  if [ "$CFG_COUNT" -ge 2 ] 2>/dev/null; then
    pass "Project KPI configs: $CFG_COUNT"
  else
    fail "Project KPI configs" "count=$CFG_COUNT (expected >= 2)"
  fi
fi

###############################################################################
# 8. POST compute — sync mode
###############################################################################
if [ -n "$PROJ_ID" ]; then
  log "POST compute (sync mode on rc.24)"
  resp=$(apicurl POST "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute")
  parse_response "$resp"
  check_401_drift "POST kpi compute"
  save_proof "kpi-compute" "$RESP_BODY"

  COMP_DATA=$(echo "$RESP_BODY" | json_unwrap)
  if [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ] || [ "$RESP_HTTP" = "202" ]; then
    pass "Compute: http=$RESP_HTTP"

    # 9. Verify computed + skipped arrays
    if $HAS_JQ; then
      COMP_COUNT=$(echo "$COMP_DATA" | jq '.computed | if type == "array" then length else 0 end' 2>/dev/null || echo "0")
      SKIP_COUNT=$(echo "$COMP_DATA" | jq '.skipped | if type == "array" then length else 0 end' 2>/dev/null || echo "0")
      HAS_ENGINE=$(echo "$COMP_DATA" | jq '[.computed[]? | .valueJson.engineVersion // empty] | length > 0' 2>/dev/null || echo "false")
      HAS_GOV_FLAG=$(echo "$COMP_DATA" | jq '[.skipped[]? | .governanceFlag // empty] | length > 0' 2>/dev/null || echo "false")
    else
      COMP_COUNT=$(echo "$COMP_DATA" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(len(d.get('computed',[])))
" 2>/dev/null || echo "0")
      SKIP_COUNT=$(echo "$COMP_DATA" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(len(d.get('skipped',[])))
" 2>/dev/null || echo "0")
      HAS_ENGINE="unknown"
      HAS_GOV_FLAG="unknown"
    fi

    log "  Computed: $COMP_COUNT, Skipped: $SKIP_COUNT"
    if [ "$COMP_COUNT" -ge 1 ] 2>/dev/null || [ "$SKIP_COUNT" -ge 1 ] 2>/dev/null; then
      pass "Compute results: computed=$COMP_COUNT skipped=$SKIP_COUNT"
    else
      warn "Compute results" "computed=$COMP_COUNT skipped=$SKIP_COUNT (expected at least 1 in either)"
    fi
  else
    fail "Compute" "http=$RESP_HTTP"
  fi
fi

###############################################################################
# Note: UI verification deferred
###############################################################################
skip "UI: Admin template KPIs section" "DEFERRED TO MANUAL"
skip "UI: Project KPIs tab" "DEFERRED TO MANUAL"

###############################################################################
# Summary
###############################################################################
summary
