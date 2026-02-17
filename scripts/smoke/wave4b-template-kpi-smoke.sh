#!/usr/bin/env bash
###############################################################################
# Wave 4B Staging Smoke Test - Template <-> KPI Binding
#
# Tests: Template KPI assignment, project instantiation auto-activation,
#        no kpi_definitions duplication
#
# Usage:
#   bash scripts/smoke/wave4b-template-kpi-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN / SMOKE_EMAIL / SMOKE_PASSWORD
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave4b"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 4B Template-KPI Smoke - $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. Fetch KPI definitions and extract first 2 IDs
###############################################################################
log "Fetch KPI definitions"
resp=$(apicurl GET "/kpis/definitions")
parse_response "$resp"
check_401_drift "GET /kpis/definitions"
save_proof "definitions" "$RESP_BODY"

DEFS_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  DEF_COUNT=$(echo "$DEFS_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
  KPI_ID_1=$(echo "$DEFS_DATA" | jq -r '.[0].id // empty' 2>/dev/null)
  KPI_ID_2=$(echo "$DEFS_DATA" | jq -r '.[1].id // empty' 2>/dev/null)
else
  DEF_COUNT=$(echo "$DEFS_DATA" | json_count)
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

[ "$DEF_COUNT" -ge 12 ] 2>/dev/null && pass "KPI definitions: $DEF_COUNT found" || fail "KPI definitions" "only $DEF_COUNT"
[ -n "$KPI_ID_1" ] && pass "KPI ID 1: $KPI_ID_1" || fail "KPI ID 1" "not found"
[ -n "$KPI_ID_2" ] && pass "KPI ID 2: $KPI_ID_2" || fail "KPI ID 2" "not found"

###############################################################################
# 5. Create a template (using POST /templates, not /admin/templates)
###############################################################################
log "Create template for KPI binding test"
resp=$(apicurl POST /templates \
  -d "{\"name\":\"W4B-KPI-Test-$(date +%s)\"}")
parse_response "$resp"
check_401_drift "POST /templates"
save_proof "template-create" "$RESP_BODY"

TPL_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
if [ -n "$TPL_ID" ]; then
  pass "Template created: $TPL_ID"
else
  fail "Template create" "http=$RESP_HTTP"
  summary
fi

###############################################################################
# 6. Assign 2 KPIs to template
###############################################################################
log "Assign KPI 1 to template (required)"
resp=$(apicurl POST "/admin/templates/$TPL_ID/kpis" \
  -d "{\"kpiDefinitionId\":\"$KPI_ID_1\",\"isRequired\":true,\"defaultTarget\":\"95.0\"}")
parse_response "$resp"
check_401_drift "POST assign KPI 1"
save_proof "assign-kpi-1" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
  pass "Assign KPI 1 (required)"
else
  fail "Assign KPI 1" "http=$RESP_HTTP"
fi

log "Assign KPI 2 to template (optional)"
resp=$(apicurl POST "/admin/templates/$TPL_ID/kpis" \
  -d "{\"kpiDefinitionId\":\"$KPI_ID_2\",\"isRequired\":false}")
parse_response "$resp"
check_401_drift "POST assign KPI 2"
save_proof "assign-kpi-2" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
  pass "Assign KPI 2 (optional)"
else
  fail "Assign KPI 2" "http=$RESP_HTTP"
fi

###############################################################################
# 7. List template KPIs - should have 2
###############################################################################
log "List template KPIs"
resp=$(apicurl GET "/admin/templates/$TPL_ID/kpis")
parse_response "$resp"
check_401_drift "GET template KPIs"
save_proof "template-kpis-list" "$RESP_BODY"

TKPIS_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  TK_COUNT=$(echo "$TKPIS_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  TK_COUNT=$(echo "$TKPIS_DATA" | json_count)
fi

[ "$TK_COUNT" -eq 2 ] 2>/dev/null && pass "Template KPIs: $TK_COUNT" || fail "Template KPIs" "expected 2, got $TK_COUNT"

###############################################################################
# 8. Instantiate project from template
###############################################################################
log "Apply template to create project"
resp=$(apicurl POST "/admin/templates/$TPL_ID/apply" \
  -d "{\"name\":\"W4B-AutoKPI-$(date +%s)\",\"workspaceId\":\"$WS_ID\"}")
parse_response "$resp"
check_401_drift "POST template apply"
save_proof "instantiate-project" "$RESP_BODY"

NEW_PROJ_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
if [ -n "$NEW_PROJ_ID" ]; then
  pass "Project instantiated: $NEW_PROJ_ID"
else
  fail "Project instantiate" "http=$RESP_HTTP"
  summary
fi

###############################################################################
# 9. Verify project KPI configs contain the 2 template KPIs
###############################################################################
log "Verify project KPI configs"
resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$NEW_PROJ_ID/kpis/config")
parse_response "$resp"
check_401_drift "GET project KPI config"
save_proof "project-kpi-configs" "$RESP_BODY"

CFG_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  CFG_COUNT=$(echo "$CFG_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
  ENABLED=$(echo "$CFG_DATA" | jq '[.[] | select(.enabled == true)] | length' 2>/dev/null || echo "0")
else
  CFG_COUNT=$(echo "$CFG_DATA" | json_count)
  ENABLED=$(echo "$CFG_DATA" | python3 -c "
import sys,json; d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
print(len([x for x in items if x.get('enabled')]))
" 2>/dev/null || echo "0")
fi

[ "$CFG_COUNT" -ge 2 ] 2>/dev/null && pass "Project KPI configs: $CFG_COUNT (>= 2 from template)" || fail "Project KPI configs" "expected >= 2, got $CFG_COUNT"
[ "$ENABLED" -ge 2 ] 2>/dev/null && pass "Enabled KPI configs: $ENABLED" || fail "Enabled configs" "expected >= 2, got $ENABLED"

###############################################################################
# 10. Verify no kpi_definitions duplication
###############################################################################
log "Verify no KPI definition duplication"
resp=$(apicurl GET "/kpis/definitions")
parse_response "$resp"
save_proof "definitions-after" "$RESP_BODY"

DEFS_AFTER=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  DEF_AFTER_COUNT=$(echo "$DEFS_AFTER" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  DEF_AFTER_COUNT=$(echo "$DEFS_AFTER" | json_count)
fi

[ "$DEF_AFTER_COUNT" -eq "$DEF_COUNT" ] 2>/dev/null && pass "No definition duplication: $DEF_AFTER_COUNT == $DEF_COUNT" || fail "Definition duplication" "$DEF_AFTER_COUNT != $DEF_COUNT"

###############################################################################
summary
