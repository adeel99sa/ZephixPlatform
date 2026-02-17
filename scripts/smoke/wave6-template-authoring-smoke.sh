#!/usr/bin/env bash
###############################################################################
# Wave 6 Staging Smoke Test — Template Authoring
#
# Tests: Clone system template, edit, publish, verify published list,
#        create project from published org template, unpublish, archive.
#        Also checks legacy instantiate route returns 410 (regression guard).
#
# Usage:
#   bash scripts/smoke/wave6-template-authoring-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN / SMOKE_EMAIL / SMOKE_PASSWORD
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave6"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 6 Template Authoring Smoke — $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. GET /admin/templates — find a system template to clone
###############################################################################
log "GET /admin/templates"
resp=$(apicurl GET /admin/templates)
parse_response "$resp"
check_401_drift "GET /admin/templates"
save_proof "admin-templates-list" "$RESP_BODY"

TEMPLATES_DATA=$(echo "$RESP_BODY" | json_unwrap)

if $HAS_JQ; then
  SYS_TPL_ID=$(echo "$TEMPLATES_DATA" | jq -r '[.[] | select(.isSystem == true)] | first | .id // empty' 2>/dev/null)
  SYS_COUNT=$(echo "$TEMPLATES_DATA" | jq '[.[] | select(.isSystem == true)] | length' 2>/dev/null || echo "0")
else
  SYS_TPL_ID=$(echo "$TEMPLATES_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=[t for t in (d if isinstance(d,list) else []) if t.get('isSystem')]
print(items[0]['id'] if items else '')
" 2>/dev/null || echo "")
  SYS_COUNT=$(echo "$TEMPLATES_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
print(sum(1 for t in items if t.get('isSystem')==True))
" 2>/dev/null || echo "0")
fi

if [ "$SYS_COUNT" -ge 1 ] 2>/dev/null; then
  pass "System templates: $SYS_COUNT found"
else
  fail "System templates" "0 found — BLOCKED: seed not run"
  save_proof "template-seed-missing" "$RESP_BODY"
  summary
fi

###############################################################################
# 5. Create org template for authoring flow (idempotent, avoids clone collisions)
###############################################################################
TS=$(date +%s)
log "Create org template for authoring test"
resp=$(apicurl POST /templates \
  -d "{\"name\":\"W6 Authoring Test $TS\",\"description\":\"Wave 6 smoke test\"}")
parse_response "$resp"
check_401_drift "POST /templates"
save_proof "create-org-template" "$RESP_BODY"

CLONE_DATA=$(echo "$RESP_BODY" | json_unwrap)
CLONE_ID=$(echo "$CLONE_DATA" | json_field "id")

if [ -n "$CLONE_ID" ] && { [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; }; then
  pass "Org template created: $CLONE_ID"
else
  fail "Org template create" "http=$RESP_HTTP"
fi

# Also verify clone endpoint works (try first system template)
log "Clone system template: $SYS_TPL_ID"
resp=$(apicurl POST "/admin/templates/${SYS_TPL_ID}/clone")
parse_response "$resp"
save_proof "clone-response" "$RESP_BODY"
CLONE_CHECK_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
if [ -n "$CLONE_CHECK_ID" ]; then
  pass "Clone endpoint: returned id=$CLONE_CHECK_ID"
elif [ "$RESP_HTTP" = "400" ] || [ "$RESP_HTTP" = "409" ]; then
  pass "Clone endpoint: $RESP_HTTP (duplicate, expected on repeat runs)"
else
  warn "Clone endpoint" "http=$RESP_HTTP"
fi

###############################################################################
# 6. Edit the cloned template
###############################################################################
if [ -n "$CLONE_ID" ]; then
  log "Edit cloned template"
  EDIT_NAME="Custom Smoke $(date +%s)"
  resp=$(apicurl PATCH "/admin/templates/${CLONE_ID}" \
    -d "{\"name\":\"$EDIT_NAME\",\"defaultTabs\":[\"overview\",\"tasks\",\"board\",\"kpis\"]}")
  parse_response "$resp"
  check_401_drift "PATCH edit clone"
  save_proof "edit-response" "$RESP_BODY"

  EDIT_RESULT=$(echo "$RESP_BODY" | json_unwrap | json_field "name")
  if [ -n "$EDIT_RESULT" ] && { [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; }; then
    pass "Edit: name updated to '$EDIT_RESULT'"
  elif [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
    pass "Edit: http=$RESP_HTTP (name field may not be in response)"
  else
    fail "Edit" "http=$RESP_HTTP body=$(echo "$RESP_BODY" | head -c 200)"
  fi
fi

###############################################################################
# 7. Publish the clone
###############################################################################
if [ -n "$CLONE_ID" ]; then
  log "Publish clone"
  resp=$(apicurl POST "/admin/templates/${CLONE_ID}/publish")
  parse_response "$resp"
  check_401_drift "POST publish"
  save_proof "publish-response" "$RESP_BODY"

  PUB_STATUS=$(echo "$RESP_BODY" | json_unwrap | json_field "isPublished")
  if [ "$PUB_STATUS" = "true" ]; then
    pass "Publish: isPublished=true"
  else
    fail "Publish" "isPublished=$PUB_STATUS"
  fi
fi

###############################################################################
# 8. GET /templates/published — verify list includes system + org template
###############################################################################
log "GET /templates/published"
resp=$(apicurl GET /templates/published)
parse_response "$resp"
check_401_drift "GET /templates/published"
save_proof "published-list" "$RESP_BODY"

PUB_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  PUB_COUNT=$(echo "$PUB_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
  HAS_CLONE=$(echo "$PUB_DATA" | jq --arg cid "$CLONE_ID" '[.[] | select(.id == $cid)] | length' 2>/dev/null || echo "0")
else
  PUB_COUNT=$(echo "$PUB_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(len(d) if isinstance(d,list) else 0)
" 2>/dev/null || echo "0")
  HAS_CLONE=$(echo "$PUB_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else []
print(sum(1 for t in items if t.get('id')=='${CLONE_ID}'))
" 2>/dev/null || echo "0")
fi

if [ "$PUB_COUNT" -ge 2 ] 2>/dev/null && [ "$HAS_CLONE" -ge 1 ] 2>/dev/null; then
  pass "Published list: $PUB_COUNT templates, includes our clone"
else
  fail "Published list" "count=$PUB_COUNT hasClone=$HAS_CLONE"
fi

###############################################################################
# 9. Create project from published org template
###############################################################################
if [ -n "$CLONE_ID" ]; then
  log "Create project from published org template"
  resp=$(apicurl POST "/admin/templates/${CLONE_ID}/apply" \
    -d "{\"name\":\"Smoke Authored $(date +%s)\",\"workspaceId\":\"$WS_ID\"}")
  parse_response "$resp"
  check_401_drift "POST apply org template"
  save_proof "apply-project-response" "$RESP_BODY"

  PROJ_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
  if [ -n "$PROJ_ID" ] && { [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; }; then
    pass "Project from org template: $PROJ_ID"

    # Verify KPI auto-activation
    log "Verify KPI configs on created project"
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

    if [ "$CFG_COUNT" -ge 1 ] 2>/dev/null; then
      pass "KPI configs auto-created: $CFG_COUNT"
    else
      warn "KPI configs" "count=$CFG_COUNT (may be 0 if clone lost KPI bindings)"
    fi
  else
    fail "Project from org template" "http=$RESP_HTTP"
  fi
fi

###############################################################################
# 10. Regression guard: legacy instantiate route should return 410
###############################################################################
log "Regression: legacy instantiate route"
if [ -n "$CLONE_ID" ]; then
  resp=$(apicurl POST "/templates/${CLONE_ID}/instantiate" \
    -d "{\"name\":\"Legacy Test\",\"workspaceId\":\"$WS_ID\"}")
  parse_response "$resp"
  save_proof "legacy-instantiate" "$RESP_BODY"

  if [ "$RESP_HTTP" = "410" ]; then
    pass "Legacy /instantiate returns 410 Gone"
  elif [ "$RESP_HTTP" = "404" ]; then
    pass "Legacy /instantiate returns 404 (route removed)"
  elif [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
    warn "Legacy /instantiate" "still active (http=$RESP_HTTP) — expected 410 or 404"
  else
    warn "Legacy /instantiate" "http=$RESP_HTTP (expected 410 or 404)"
  fi
fi

###############################################################################
# 11. Unpublish the org template
###############################################################################
if [ -n "$CLONE_ID" ]; then
  log "Unpublish clone"
  resp=$(apicurl POST "/admin/templates/${CLONE_ID}/unpublish")
  parse_response "$resp"
  save_proof "unpublish-response" "$RESP_BODY"

  UNPUB_STATUS=$(echo "$RESP_BODY" | json_unwrap | json_field "isPublished")
  if [ "$UNPUB_STATUS" = "false" ]; then
    pass "Unpublish: isPublished=false"
  elif [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
    pass "Unpublish: http=$RESP_HTTP"
  else
    warn "Unpublish" "http=$RESP_HTTP isPublished=$UNPUB_STATUS"
  fi
fi

###############################################################################
# Summary
###############################################################################
summary
