#!/usr/bin/env bash
###############################################################################
# Wave 9 Staging Smoke Test — Governance Rules Engine
#
# Tests: Rule set CRUD, rule versioning, evaluations endpoint, auth guards.
#
# Usage:
#   bash scripts/smoke/wave9-governance-rules-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN / SMOKE_EMAIL / SMOKE_PASSWORD
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave9"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 9 Governance Rules Smoke — $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. Unauthenticated access check
###############################################################################
log "Unauthenticated GET /admin/governance-rules/rule-sets"
UNAUTH_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/governance-rules/rule-sets" 2>/dev/null)
if [ "$UNAUTH_HTTP" = "401" ]; then
  pass "GET rule-sets without token -> 401"
elif [ "$UNAUTH_HTTP" = "403" ]; then
  pass "GET rule-sets without token -> 403 (CSRF guard)"
else
  fail "Unauth GET" "expected 401/403, got $UNAUTH_HTTP"
fi

###############################################################################
# 5. GET /admin/governance-rules/rule-sets
###############################################################################
log "GET /admin/governance-rules/rule-sets"
resp=$(apicurl GET /admin/governance-rules/rule-sets)
parse_response "$resp"
check_401_drift "GET rule-sets"
save_proof "rule-sets-list" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ]; then
  pass "GET rule-sets: http=200"
else
  fail "GET rule-sets" "http=$RESP_HTTP"
fi

###############################################################################
# 6. POST /admin/governance-rules/rule-sets — create
###############################################################################
log "Create rule set"
resp=$(apicurl POST /admin/governance-rules/rule-sets \
  -d '{"scopeType":"SYSTEM","entityType":"TASK","name":"Smoke Task Guards '$(date +%s)'","enforcementMode":"BLOCK"}')
parse_response "$resp"
check_401_drift "POST rule-sets"
save_proof "rule-set-create" "$RESP_BODY"

RS_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
if [ -n "$RS_ID" ] && { [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; }; then
  pass "Rule set created: $RS_ID"
else
  fail "Rule set create" "http=$RESP_HTTP id=$RS_ID"
fi

###############################################################################
# 7. POST /rule-sets/:id/rules — add rule version
###############################################################################
if [ -n "$RS_ID" ]; then
  log "Add rule to set: $RS_ID"
  resp=$(apicurl POST "/admin/governance-rules/rule-sets/$RS_ID/rules" \
    -d '{"code":"SMOKE_TASK_DONE_REQUIRES_ASSIGNEE","ruleDefinition":{"when":{"toStatus":"DONE"},"conditions":[{"type":"REQUIRED_FIELD","field":"assigneeUserId"}],"message":"Smoke: assignee required for Done","severity":"ERROR"},"setActive":true}')
  parse_response "$resp"
  check_401_drift "POST rules"
  save_proof "rule-create" "$RESP_BODY"

  RULE_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
  if [ -n "$RULE_ID" ] && { [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; }; then
    pass "Rule created: $RULE_ID"
  else
    warn "Rule create" "http=$RESP_HTTP id=$RULE_ID"
  fi
fi

###############################################################################
# 8. GET /rule-sets/:id/rules/active
###############################################################################
if [ -n "$RS_ID" ]; then
  log "List active rules for set: $RS_ID"
  resp=$(apicurl GET "/admin/governance-rules/rule-sets/$RS_ID/rules/active")
  parse_response "$resp"
  save_proof "active-rules" "$RESP_BODY"

  if [ "$RESP_HTTP" = "200" ]; then
    ACTIVE_DATA=$(echo "$RESP_BODY" | json_unwrap)
    if $HAS_JQ; then
      ACTIVE_COUNT=$(echo "$ACTIVE_DATA" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
    else
      ACTIVE_COUNT=$(echo "$ACTIVE_DATA" | json_count)
    fi
    if [ "$ACTIVE_COUNT" -ge 1 ] 2>/dev/null; then
      pass "Active rules: $ACTIVE_COUNT"
    else
      warn "Active rules" "count=$ACTIVE_COUNT (expected >= 1)"
    fi
  else
    fail "Active rules" "http=$RESP_HTTP"
  fi
fi

###############################################################################
# 9. GET /evaluations/:workspaceId
###############################################################################
log "GET evaluations for workspace"
resp=$(apicurl GET "/admin/governance-rules/evaluations/$WS_ID")
parse_response "$resp"
save_proof "evaluations-list" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ]; then
  pass "Evaluations endpoint: http=200"
else
  warn "Evaluations" "http=$RESP_HTTP"
fi

###############################################################################
# 10. POST /rule-sets/:id/deactivate
###############################################################################
if [ -n "$RS_ID" ]; then
  log "Deactivate rule set: $RS_ID"
  resp=$(apicurl POST "/admin/governance-rules/rule-sets/$RS_ID/deactivate")
  parse_response "$resp"
  save_proof "rule-set-deactivate" "$RESP_BODY"

  IS_ACTIVE=$(echo "$RESP_BODY" | json_unwrap | json_field "isActive")
  if [ "$IS_ACTIVE" = "false" ]; then
    pass "Rule set deactivated"
  elif [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
    pass "Deactivate: http=$RESP_HTTP"
  else
    warn "Deactivate" "http=$RESP_HTTP isActive=$IS_ACTIVE"
  fi
fi

###############################################################################
summary
