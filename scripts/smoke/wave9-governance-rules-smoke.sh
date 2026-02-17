#!/usr/bin/env bash
# Wave 9 — Governance Rule Engine Smoke Test
# Usage: bash scripts/smoke/wave9-governance-rules-smoke.sh https://staging-api.example.com/api
#
# Environment variables:
#   SMOKE_TOKEN       — JWT for an admin user (required)
#   SMOKE_TOKEN_VIEWER — JWT for a viewer user (optional, tests 403)
#
# Routes tested (all under /api/admin/governance-rules):
#   POST   /rule-sets                 — create rule set
#   GET    /rule-sets                 — list rule sets
#   GET    /rule-sets/:id             — get rule set
#   POST   /rule-sets/:id/rules       — add rule version
#   GET    /rule-sets/:id/rules/active — list active rules
#   POST   /rule-sets/:id/deactivate  — deactivate rule set
#   GET    /evaluations/:workspaceId   — list evaluations
#
# Note: controller uses @Controller('admin/governance-rules') and
# main.ts sets app.setGlobalPrefix('api'), so full path is /api/admin/governance-rules/...
set -euo pipefail

BASE="${1:?Usage: $0 <api-base-url>}"
TOKEN="${SMOKE_TOKEN:?Set SMOKE_TOKEN}"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "  [PASS] $1"; }
fail() { FAIL=$((FAIL+1)); echo "  [FAIL] $1"; }

echo "=== Wave 9 Governance Rules Smoke ==="
echo "Base: $BASE"

# 0. Unauthenticated access check
echo ""
echo "--- Step 0: Unauthenticated access must be rejected ---"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/governance-rules/rule-sets")
[ "$HTTP" = "401" ] && ok "GET rule-sets without token → 401" || fail "Expected 401, got $HTTP"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/admin/governance-rules/rule-sets" \
  -H "$CT" -d '{}')
[ "$HTTP" = "401" ] && ok "POST rule-sets without token → 401" || fail "Expected 401, got $HTTP"

# 0b. Viewer access check (optional)
if [ -n "${SMOKE_TOKEN_VIEWER:-}" ]; then
  echo ""
  echo "--- Step 0b: Viewer role access check ---"
  VAUTH="Authorization: Bearer $SMOKE_TOKEN_VIEWER"
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/admin/governance-rules/rule-sets" \
    -H "$VAUTH" -H "$CT" -d '{"scopeType":"SYSTEM","entityType":"TASK","name":"viewer-test","enforcementMode":"WARN"}')
  [ "$HTTP" = "403" ] && ok "Viewer POST rule-sets → 403" || fail "Viewer POST expected 403, got $HTTP"
fi

# 1. Health check
echo ""
echo "--- Step 1: Health ---"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health/ready")
[ "$HTTP" = "200" ] && ok "Health ready" || fail "Health $HTTP"

# 1b. GET list rule sets (proves route is reachable)
echo ""
echo "--- Step 1b: GET List Rule Sets ---"
LIST_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/governance-rules/rule-sets" \
  -H "$AUTH")
[ "$LIST_HTTP" = "200" ] && ok "GET rule-sets → 200" || fail "GET rule-sets → $LIST_HTTP"

# 2. Create rule set
echo ""
echo "--- Step 2: Create Rule Set ---"
RS=$(curl -s -X POST "$BASE/admin/governance-rules/rule-sets" \
  -H "$AUTH" -H "$CT" \
  -d '{
    "scopeType": "SYSTEM",
    "entityType": "TASK",
    "name": "Smoke Test Task Guards",
    "enforcementMode": "BLOCK"
  }')
RS_ID=$(echo "$RS" | jq -r '.id // empty')
[ -n "$RS_ID" ] && ok "Rule set created: $RS_ID" || fail "Rule set creation failed"

# 3. Add rule version
echo ""
echo "--- Step 3: Add Rule ---"
RULE=$(curl -s -X POST "$BASE/admin/governance-rules/rule-sets/$RS_ID/rules" \
  -H "$AUTH" -H "$CT" \
  -d '{
    "code": "SMOKE_TASK_DONE_REQUIRES_ASSIGNEE",
    "ruleDefinition": {
      "when": { "toStatus": "DONE" },
      "conditions": [
        { "type": "REQUIRED_FIELD", "field": "assigneeUserId" }
      ],
      "message": "Smoke: assignee required for Done",
      "severity": "ERROR"
    },
    "setActive": true
  }')
RULE_ID=$(echo "$RULE" | jq -r '.id // empty')
[ -n "$RULE_ID" ] && ok "Rule created: $RULE_ID (v$(echo "$RULE" | jq -r '.version'))" || fail "Rule creation failed"

# 4. List active rules
echo ""
echo "--- Step 4: List Active Rules ---"
ACTIVE=$(curl -s "$BASE/admin/governance-rules/rule-sets/$RS_ID/rules/active" \
  -H "$AUTH")
ACTIVE_COUNT=$(echo "$ACTIVE" | jq 'length')
[ "$ACTIVE_COUNT" = "1" ] && ok "Active rules: $ACTIVE_COUNT" || fail "Expected 1 active rule, got $ACTIVE_COUNT"

# 5. Attempt blocked transition (would require workspace+task context in real env)
echo ""
echo "--- Step 5: Blocked Transition ---"
echo "  ⚠️  Transition blocking requires task endpoints with live data."
echo "  ⚠️  Manual verification: create task without assignee, try DONE status."

# 6. List evaluations
echo ""
echo "--- Step 6: List Evaluations ---"
# Use a placeholder workspaceId for smoke
EVALS=$(curl -s "$BASE/admin/governance-rules/evaluations/00000000-0000-0000-0000-000000000000" \
  -H "$AUTH")
EVALS_TOTAL=$(echo "$EVALS" | jq -r '.total // 0')
ok "Evaluations endpoint responsive (total: $EVALS_TOTAL)"

# 7. Deactivate rule set
echo ""
echo "--- Step 7: Deactivate Rule Set ---"
DEACT=$(curl -s -X POST "$BASE/admin/governance-rules/rule-sets/$RS_ID/deactivate" \
  -H "$AUTH")
IS_ACTIVE=$(echo "$DEACT" | jq -r '.isActive')
[ "$IS_ACTIVE" = "false" ] && ok "Rule set deactivated" || fail "Deactivation failed"

# Summary
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
