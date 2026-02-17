#!/usr/bin/env bash
###############################################################################
# Wave 5 Staging Smoke Test — Template Library & Seeding
#
# Tests: System templates exist, delivery methods, governance flags,
#        KPI pack bindings, project creation from templates, KPI auto-activation
#
# Usage:
#   bash scripts/smoke/wave5-template-library-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN       — Bearer JWT (skips cookie login)
#   SMOKE_EMAIL       — login email   (default: demo@zephix.ai)
#   SMOKE_PASSWORD    — login password (default: demo123456)
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave5"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 5 Template Library Smoke — $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. GET /admin/templates — verify system templates exist
###############################################################################
log "GET /admin/templates"
resp=$(apicurl GET /admin/templates)
parse_response "$resp"
check_401_drift "GET /admin/templates"
save_proof "admin-templates-list" "$RESP_BODY"

TEMPLATES_DATA=$(echo "$RESP_BODY" | json_unwrap)

if $HAS_JQ; then
  SYS_COUNT=$(echo "$TEMPLATES_DATA" | jq '[.[] | select(.isSystem == true)] | length' 2>/dev/null || echo "0")
else
  SYS_COUNT=$(echo "$TEMPLATES_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
print(sum(1 for t in items if t.get('isSystem')==True))
" 2>/dev/null || echo "0")
fi

if [ "$SYS_COUNT" -ge 4 ] 2>/dev/null; then
  pass "System templates: $SYS_COUNT found (>= 4)"
elif [ "$SYS_COUNT" -eq 0 ] 2>/dev/null; then
  fail "System templates" "0 found — BLOCKED: seed not run on staging"
  save_proof "template-seed-missing" "$RESP_BODY"
  log "STOP: System template seed has not been run on staging."
  log "Run: TEMPLATE_CENTER_SEED_OK=true npx ts-node src/scripts/seed-system-templates.ts"
  summary
else
  warn "System templates" "$SYS_COUNT found (expected >= 4)"
fi

###############################################################################
# 5. Verify delivery methods
###############################################################################
log "Verify delivery methods"
if $HAS_JQ; then
  METHODS=$(echo "$TEMPLATES_DATA" | jq -r '[.[] | select(.isSystem == true) | .deliveryMethod] | unique | sort | join(",")' 2>/dev/null)
else
  METHODS=$(echo "$TEMPLATES_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
methods=sorted(set(t.get('deliveryMethod','') for t in items if t.get('isSystem')))
print(','.join(m for m in methods if m))
" 2>/dev/null || echo "")
fi

EXPECTED_METHODS="HYBRID,KANBAN,SCRUM,WATERFALL"
if [ "$METHODS" = "$EXPECTED_METHODS" ]; then
  pass "Delivery methods: $METHODS"
else
  fail "Delivery methods" "got=$METHODS expected=$EXPECTED_METHODS"
fi

###############################################################################
# 6. Verify template bundle fields
###############################################################################
log "Verify template fields (defaultTabs, defaultGovernanceFlags, boundKpiCount)"
if $HAS_JQ; then
  FIELD_CHECK=$(echo "$TEMPLATES_DATA" | jq '
    [.[] | select(.isSystem == true)] |
    all(
      .defaultTabs != null and
      (.defaultTabs | length) > 0 and
      .defaultGovernanceFlags != null
    )
  ' 2>/dev/null || echo "false")
else
  FIELD_CHECK=$(echo "$TEMPLATES_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=[t for t in (d if isinstance(d,list) else []) if t.get('isSystem')]
ok=all(
  t.get('defaultTabs') and len(t['defaultTabs'])>0 and
  t.get('defaultGovernanceFlags') is not None
  for t in items
) if items else False
print('true' if ok else 'false')
" 2>/dev/null || echo "false")
fi

[ "$FIELD_CHECK" = "true" ] && pass "Template fields present" || fail "Template fields" "missing defaultTabs or defaultGovernanceFlags"

###############################################################################
# 7. Find a Scrum template and create project from it
###############################################################################
log "Create project from Scrum template"
if $HAS_JQ; then
  SCRUM_TPL_ID=$(echo "$TEMPLATES_DATA" | jq -r '[.[] | select(.isSystem == true and .deliveryMethod == "SCRUM")] | first | .id // empty' 2>/dev/null)
else
  SCRUM_TPL_ID=$(echo "$TEMPLATES_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=[t for t in (d if isinstance(d,list) else []) if t.get('isSystem') and t.get('deliveryMethod')=='SCRUM']
print(items[0]['id'] if items else '')
" 2>/dev/null || echo "")
fi

SCRUM_PROJ_ID=""
if [ -n "$SCRUM_TPL_ID" ]; then
  resp=$(apicurl POST "/admin/templates/${SCRUM_TPL_ID}/apply" \
    -d "{\"name\":\"Smoke Scrum $(date +%s)\",\"workspaceId\":\"$WS_ID\"}")
  parse_response "$resp"
  check_401_drift "POST /admin/templates/:id/apply (scrum)"
  save_proof "scrum-project-create" "$RESP_BODY"

  SCRUM_PROJ_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
  if [ -n "$SCRUM_PROJ_ID" ] && [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
    pass "Scrum project created: $SCRUM_PROJ_ID"
  else
    fail "Scrum project" "http=$RESP_HTTP id=$SCRUM_PROJ_ID"
  fi
else
  skip "Scrum project" "no Scrum template found"
fi

###############################################################################
# 8. Verify Scrum project KPI auto-activation
###############################################################################
if [ -n "$SCRUM_PROJ_ID" ]; then
  log "Verify Scrum KPI auto-activation"
  resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$SCRUM_PROJ_ID/kpis/config")
  parse_response "$resp"
  check_401_drift "GET scrum kpi config"
  save_proof "scrum-kpi-configs" "$RESP_BODY"

  CONFIGS_DATA=$(echo "$RESP_BODY" | json_unwrap)
  if $HAS_JQ; then
    ENABLED_COUNT=$(echo "$CONFIGS_DATA" | jq '[.[] | select(.enabled == true)] | length' 2>/dev/null || echo "0")
  else
    ENABLED_COUNT=$(echo "$CONFIGS_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
print(sum(1 for c in items if c.get('enabled')))
" 2>/dev/null || echo "0")
  fi

  if [ "$ENABLED_COUNT" -ge 3 ] 2>/dev/null; then
    pass "Scrum KPI auto-activation: $ENABLED_COUNT enabled"
  else
    fail "Scrum KPI auto-activation" "enabled=$ENABLED_COUNT (expected >= 3)"
  fi
else
  skip "Scrum KPI auto-activation" "no project created"
fi

###############################################################################
# 9. Create project from Waterfall template
###############################################################################
log "Create project from Waterfall template"
if $HAS_JQ; then
  WF_TPL_ID=$(echo "$TEMPLATES_DATA" | jq -r '[.[] | select(.isSystem == true and .deliveryMethod == "WATERFALL")] | first | .id // empty' 2>/dev/null)
else
  WF_TPL_ID=$(echo "$TEMPLATES_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=[t for t in (d if isinstance(d,list) else []) if t.get('isSystem') and t.get('deliveryMethod')=='WATERFALL']
print(items[0]['id'] if items else '')
" 2>/dev/null || echo "")
fi

WF_PROJ_ID=""
if [ -n "$WF_TPL_ID" ]; then
  resp=$(apicurl POST "/admin/templates/${WF_TPL_ID}/apply" \
    -d "{\"name\":\"Smoke Waterfall $(date +%s)\",\"workspaceId\":\"$WS_ID\"}")
  parse_response "$resp"
  check_401_drift "POST /admin/templates/:id/apply (waterfall)"
  save_proof "waterfall-project-create" "$RESP_BODY"

  WF_PROJ_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
  if [ -n "$WF_PROJ_ID" ] && [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
    pass "Waterfall project created: $WF_PROJ_ID"
  else
    fail "Waterfall project" "http=$RESP_HTTP"
  fi
else
  skip "Waterfall project" "no Waterfall template found"
fi

###############################################################################
# 10. Verify Waterfall project governance + KPIs
###############################################################################
if [ -n "$WF_PROJ_ID" ]; then
  log "Verify Waterfall KPI auto-activation"
  resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$WF_PROJ_ID/kpis/config")
  parse_response "$resp"
  check_401_drift "GET waterfall kpi config"
  save_proof "waterfall-kpi-configs" "$RESP_BODY"

  WF_CONFIGS=$(echo "$RESP_BODY" | json_unwrap)
  if $HAS_JQ; then
    WF_ENABLED=$(echo "$WF_CONFIGS" | jq '[.[] | select(.enabled == true)] | length' 2>/dev/null || echo "0")
  else
    WF_ENABLED=$(echo "$WF_CONFIGS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
print(sum(1 for c in items if c.get('enabled')))
" 2>/dev/null || echo "0")
  fi

  if [ "$WF_ENABLED" -ge 3 ] 2>/dev/null; then
    pass "Waterfall KPI auto-activation: $WF_ENABLED enabled"
  else
    fail "Waterfall KPI auto-activation" "enabled=$WF_ENABLED (expected >= 3)"
  fi
else
  skip "Waterfall KPI auto-activation" "no project created"
fi

###############################################################################
# Summary
###############################################################################
summary
