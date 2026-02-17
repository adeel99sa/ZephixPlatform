#!/usr/bin/env bash
###############################################################################
# Wave 7 Staging Smoke Test — Template Library Expansion
#
# Tests: 12 system templates (3 per delivery method), template detail fields,
#        clone/edit/publish flow, published list count.
#
# Usage:
#   bash scripts/smoke/wave7-template-library-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN / SMOKE_EMAIL / SMOKE_PASSWORD
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave7"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 7 Template Library Expansion Smoke — $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. GET /admin/templates — expect >= 12 system templates
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

if [ "$SYS_COUNT" -ge 12 ] 2>/dev/null; then
  pass "System templates: $SYS_COUNT found (>= 12)"
elif [ "$SYS_COUNT" -ge 4 ] 2>/dev/null; then
  warn "System templates" "$SYS_COUNT found (Wave 5 seed ran, Wave 7 expansion seed may not have run)"
elif [ "$SYS_COUNT" -eq 0 ] 2>/dev/null; then
  fail "System templates" "0 found — BLOCKED: seed not run on staging"
  save_proof "template-seed-missing" "$(echo "$RESP_BODY" | json_pp)"
  log "STOP: System template seed has not been run on staging."
  summary
else
  warn "System templates" "$SYS_COUNT found"
fi

###############################################################################
# 5. Group by delivery method
###############################################################################
log "Group by delivery method"
if $HAS_JQ; then
  METHOD_GROUPS=$(echo "$TEMPLATES_DATA" | jq '
    [.[] | select(.isSystem == true)] |
    group_by(.deliveryMethod) |
    map({method: .[0].deliveryMethod, count: length}) |
    sort_by(.method)
  ' 2>/dev/null)
  echo "$METHOD_GROUPS" | json_pp > "$PROOF_DIR/delivery-method-groups.json"

  GROUP_COUNT=$(echo "$METHOD_GROUPS" | jq 'length' 2>/dev/null || echo "0")
  ALL_HAVE_3=$(echo "$METHOD_GROUPS" | jq 'all(.count >= 3)' 2>/dev/null || echo "false")
else
  METHOD_GROUPS=$(echo "$TEMPLATES_DATA" | python3 -c "
import sys,json
from collections import Counter
d=json.load(sys.stdin)
items=[t for t in (d if isinstance(d,list) else []) if t.get('isSystem')]
c=Counter(t.get('deliveryMethod','') for t in items)
result=[{'method':m,'count':n} for m,n in sorted(c.items()) if m]
print(json.dumps(result))
" 2>/dev/null || echo "[]")
  echo "$METHOD_GROUPS" | json_pp > "$PROOF_DIR/delivery-method-groups.json"
  GROUP_COUNT=$(echo "$METHOD_GROUPS" | json_count)
  ALL_HAVE_3=$(echo "$METHOD_GROUPS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('true' if all(g.get('count',0)>=3 for g in d) else 'false')
" 2>/dev/null || echo "false")
fi

if [ "$GROUP_COUNT" -ge 4 ] 2>/dev/null; then
  pass "Delivery method groups: $GROUP_COUNT methods"
else
  fail "Delivery method groups" "count=$GROUP_COUNT (expected 4)"
fi

if [ "$ALL_HAVE_3" = "true" ] && [ "$SYS_COUNT" -ge 12 ] 2>/dev/null; then
  pass "3 templates per method"
else
  if [ "$SYS_COUNT" -ge 12 ] 2>/dev/null; then
    fail "Templates per method" "not all methods have 3"
  else
    skip "Templates per method" "only $SYS_COUNT system templates (need 12 for this check)"
  fi
fi

###############################################################################
# 6. Verify template detail fields
###############################################################################
log "Verify template detail fields"
if $HAS_JQ; then
  FIRST_SYS_ID=$(echo "$TEMPLATES_DATA" | jq -r '[.[] | select(.isSystem == true)] | first | .id // empty' 2>/dev/null)
else
  FIRST_SYS_ID=$(echo "$TEMPLATES_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=[t for t in (d if isinstance(d,list) else []) if t.get('isSystem')]
print(items[0]['id'] if items else '')
" 2>/dev/null || echo "")
fi

if [ -n "$FIRST_SYS_ID" ]; then
  resp=$(apicurl GET "/admin/templates/${FIRST_SYS_ID}")
  parse_response "$resp"
  check_401_drift "GET template detail"
  save_proof "template-detail" "$RESP_BODY"

  DETAIL=$(echo "$RESP_BODY" | json_unwrap)
  if $HAS_JQ; then
    HAS_TABS=$(echo "$DETAIL" | jq 'if .defaultTabs then (.defaultTabs | length) > 0 else false end' 2>/dev/null || echo "false")
    HAS_FLAGS=$(echo "$DETAIL" | jq '.defaultGovernanceFlags != null' 2>/dev/null || echo "false")
    HAS_METHOD=$(echo "$DETAIL" | jq '.deliveryMethod != null' 2>/dev/null || echo "false")
  else
    HAS_TABS=$(echo "$DETAIL" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('true' if d.get('defaultTabs') and len(d['defaultTabs'])>0 else 'false')
" 2>/dev/null || echo "false")
    HAS_FLAGS=$(echo "$DETAIL" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('true' if d.get('defaultGovernanceFlags') is not None else 'false')
" 2>/dev/null || echo "false")
    HAS_METHOD=$(echo "$DETAIL" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('true' if d.get('deliveryMethod') else 'false')
" 2>/dev/null || echo "false")
  fi

  [ "$HAS_TABS" = "true" ] && pass "Template detail: defaultTabs present" || fail "Template detail" "defaultTabs missing"
  [ "$HAS_FLAGS" = "true" ] && pass "Template detail: defaultGovernanceFlags present" || fail "Template detail" "defaultGovernanceFlags missing"
  [ "$HAS_METHOD" = "true" ] && pass "Template detail: deliveryMethod present" || fail "Template detail" "deliveryMethod missing"
else
  skip "Template detail" "no system template to inspect"
fi

###############################################################################
# 7. Clone, edit, publish
###############################################################################
CLONE_ID=""
if [ -n "$FIRST_SYS_ID" ]; then
  log "Clone template"
  resp=$(apicurl POST "/admin/templates/${FIRST_SYS_ID}/clone")
  parse_response "$resp"
  check_401_drift "POST clone"
  save_proof "clone-response" "$RESP_BODY"

  CLONE_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
  [ -n "$CLONE_ID" ] && pass "Clone: $CLONE_ID" || fail "Clone" "no id returned"

  if [ -n "$CLONE_ID" ]; then
    resp=$(apicurl PATCH "/admin/templates/${CLONE_ID}" \
      -d '{"name":"Wave7 Custom Template"}')
    parse_response "$resp"
    check_401_drift "PATCH edit"
    EDIT_NAME=$(echo "$RESP_BODY" | json_unwrap | json_field "name")
    [ "$EDIT_NAME" = "Wave7 Custom Template" ] && pass "Edit: name updated" || fail "Edit" "name=$EDIT_NAME"

    resp=$(apicurl POST "/admin/templates/${CLONE_ID}/publish")
    parse_response "$resp"
    check_401_drift "POST publish"
    PUB=$(echo "$RESP_BODY" | json_unwrap | json_field "isPublished")
    [ "$PUB" = "true" ] && pass "Publish: isPublished=true" || fail "Publish" "isPublished=$PUB"
  fi
fi

###############################################################################
# 8. GET /templates/published — count
###############################################################################
log "GET /templates/published"
resp=$(apicurl GET /templates/published)
parse_response "$resp"
check_401_drift "GET /templates/published"
save_proof "published-list" "$RESP_BODY"

PUB_DATA=$(echo "$RESP_BODY" | json_unwrap)
if $HAS_JQ; then
  PUB_COUNT=$(echo "$PUB_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
else
  PUB_COUNT=$(echo "$PUB_DATA" | json_count)
fi

EXPECTED_MIN=$((SYS_COUNT + 1))
if [ "$PUB_COUNT" -ge "$EXPECTED_MIN" ] 2>/dev/null; then
  pass "Published list: $PUB_COUNT (>= $EXPECTED_MIN including clone)"
else
  if [ -z "$CLONE_ID" ]; then
    skip "Published list" "no clone created"
  else
    fail "Published list" "count=$PUB_COUNT expected >= $EXPECTED_MIN"
  fi
fi

###############################################################################
# Cleanup: unpublish the clone to avoid polluting staging
###############################################################################
if [ -n "$CLONE_ID" ]; then
  apicurl POST "/admin/templates/${CLONE_ID}/unpublish" > /dev/null 2>&1 || true
fi

###############################################################################
# Summary
###############################################################################
summary
