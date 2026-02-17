#!/usr/bin/env bash
###############################################################################
# Wave 4D Staging Smoke Test — KPI Packs
#
# Tests: List packs (source of truth), apply pack, idempotency,
#        unknown pack rejection, project KPI auto-activation from pack.
#
# Usage:
#   bash scripts/smoke/wave4d-kpi-packs-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN / SMOKE_EMAIL / SMOKE_PASSWORD
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave4d"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 4D KPI Packs Smoke — $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. Create template for pack testing
###############################################################################
log "Create template for pack test"
resp=$(apicurl POST /templates \
  -d "{\"name\":\"Wave4D Pack Test $(date +%s)\"}")
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

###############################################################################
# 5. GET packs — source of truth
###############################################################################
log "GET KPI packs"
resp=$(apicurl GET "/admin/templates/${TPL_ID}/kpis/packs")
parse_response "$resp"
check_401_drift "GET packs"
save_proof "kpi-packs-list" "$RESP_BODY"

PACKS_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  PACK_COUNT=$(echo "$PACKS_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
  PACK_CODES=$(echo "$PACKS_DATA" | jq -r '[.[].code // .[].packCode // empty] | sort | join(",")' 2>/dev/null || echo "")
else
  PACK_COUNT=$(echo "$PACKS_DATA" | json_count)
  PACK_CODES=$(echo "$PACKS_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
codes=sorted(t.get('code',t.get('packCode','')) for t in items)
print(','.join(c for c in codes if c))
" 2>/dev/null || echo "")
fi

if [ "$PACK_COUNT" -lt 4 ] 2>/dev/null; then
  fail "KPI packs" "PLATFORM CONTRACT FAILURE: $PACK_COUNT packs found (expected >= 4). Codes: $PACK_CODES"
  log "STOP: Pack list returned fewer than 4 packs. This is a platform contract failure."
  save_proof "packs-contract-failure" "$RESP_BODY"
  summary
fi

pass "KPI packs: $PACK_COUNT found — $PACK_CODES"

###############################################################################
# 6. Apply scrum_core pack
###############################################################################
log "Apply scrum_core pack"
resp=$(apicurl POST "/admin/templates/${TPL_ID}/kpis/packs/scrum_core/apply")
parse_response "$resp"
check_401_drift "POST apply scrum_core"
save_proof "pack-apply-scrum-core" "$RESP_BODY"

APPLY_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  BINDING_COUNT=$(echo "$APPLY_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  BINDING_COUNT=$(echo "$APPLY_DATA" | json_count)
fi

if [ "$BINDING_COUNT" -ge 3 ] 2>/dev/null; then
  pass "scrum_core applied: $BINDING_COUNT bindings"
else
  fail "scrum_core apply" "bindings=$BINDING_COUNT (expected >= 3)"
fi

###############################################################################
# 7. Verify binding details
###############################################################################
log "Verify binding KPI codes"
if $HAS_JQ; then
  BOUND_CODES=$(echo "$APPLY_DATA" | jq -r '[.[] | .kpiCode // .kpiDefinition.code // empty] | sort | join(",")' 2>/dev/null || echo "")
else
  BOUND_CODES=$(echo "$APPLY_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
codes=sorted(t.get('kpiCode',t.get('kpiDefinition',{}).get('code','')) for t in items)
print(','.join(c for c in codes if c))
" 2>/dev/null || echo "")
fi

save_proof "bound-kpi-codes" "{\"codes\":\"$BOUND_CODES\",\"count\":$BINDING_COUNT}" ".json"
log "  Bound KPIs: $BOUND_CODES"
pass "Binding codes: $BOUND_CODES"

###############################################################################
# 8. Idempotency — apply same pack again
###############################################################################
log "Idempotency: apply scrum_core again"
resp=$(apicurl POST "/admin/templates/${TPL_ID}/kpis/packs/scrum_core/apply")
parse_response "$resp"
check_401_drift "POST apply scrum_core (idempotent)"
save_proof "pack-apply-idempotent" "$RESP_BODY"

IDEM_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  IDEM_COUNT=$(echo "$IDEM_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  IDEM_COUNT=$(echo "$IDEM_DATA" | json_count)
fi

if [ "$IDEM_COUNT" -eq "$BINDING_COUNT" ] 2>/dev/null; then
  pass "Idempotency: count unchanged ($IDEM_COUNT == $BINDING_COUNT)"
else
  fail "Idempotency" "count=$IDEM_COUNT (was $BINDING_COUNT)"
fi

###############################################################################
# 9. Unknown pack — expect 400
###############################################################################
log "Reject unknown pack"
resp=$(apicurl POST "/admin/templates/${TPL_ID}/kpis/packs/nonexistent_pack/apply")
parse_response "$resp"
save_proof "unknown-pack-response" "$RESP_BODY"

if [ "$RESP_HTTP" = "400" ]; then
  pass "Unknown pack rejected: 400"
elif [ "$RESP_HTTP" = "404" ]; then
  pass "Unknown pack rejected: 404"
else
  fail "Unknown pack" "http=$RESP_HTTP (expected 400 or 404)"
fi

###############################################################################
# 10. Create project from template, verify KPI auto-activation
###############################################################################
log "Create project from pack-bound template"
resp=$(apicurl POST "/admin/templates/${TPL_ID}/apply" \
  -d "{\"name\":\"Wave4D Proj $(date +%s)\",\"workspaceId\":\"$WS_ID\"}")
parse_response "$resp"
check_401_drift "POST apply template"
save_proof "project-create" "$RESP_BODY"

PROJ_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
if [ -n "$PROJ_ID" ]; then
  pass "Project created: $PROJ_ID"
else
  fail "Project create" "http=$RESP_HTTP"
  summary
fi

log "Verify auto-activated KPI configs"
resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/config")
parse_response "$resp"
check_401_drift "GET project kpi config"
save_proof "project-kpi-configs" "$RESP_BODY"

CFG_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  CFG_ENABLED=$(echo "$CFG_DATA" | jq '[.[] | select(.enabled == true)] | length' 2>/dev/null || echo "0")
else
  CFG_ENABLED=$(echo "$CFG_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
print(sum(1 for c in items if c.get('enabled')))
" 2>/dev/null || echo "0")
fi

if [ "$CFG_ENABLED" -ge "$BINDING_COUNT" ] 2>/dev/null; then
  pass "KPI auto-activation: $CFG_ENABLED enabled (>= $BINDING_COUNT pack bindings)"
else
  fail "KPI auto-activation" "enabled=$CFG_ENABLED (expected >= $BINDING_COUNT)"
fi

###############################################################################
# Summary
###############################################################################
summary
