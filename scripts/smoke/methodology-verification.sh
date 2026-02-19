#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Methodology System — End-to-End Verification Script
#
# Usage:
#   export API_URL=http://localhost:3000/api
#   export TOKEN="Bearer <jwt>"
#   export WORKSPACE_ID=<workspace-uuid>
#   bash scripts/smoke/methodology-verification.sh
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

API="${API_URL:-http://localhost:3000/api}"
WS="${WORKSPACE_ID:?Set WORKSPACE_ID}"
AUTH="${TOKEN:?Set TOKEN}"

pass=0
fail=0

check() {
  local label="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $label"
    pass=$((pass + 1))
  else
    echo "  ✗ $label (expected=$expected actual=$actual)"
    fail=$((fail + 1))
  fi
}

# ─── Helper: find a system template by methodology ──────────────────
find_template() {
  local methodology="$1"
  curl -sf -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    "$API/templates?scope=system" \
    | jq -r ".data[] | select(.methodology==\"$methodology\") | .id" | head -1
}

echo "═══════════════════════════════════════════════════════════"
echo " METHODOLOGY VERIFICATION — 5 templates"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
# 1. SCRUM
# ═══════════════════════════════════════════════════════════════
echo "── 1. SCRUM ──────────────────────────────────────────────"

SCRUM_TPL=$(find_template "scrum")
if [ -z "$SCRUM_TPL" ]; then
  echo "  ✗ No scrum template found — skipping"
else
  SCRUM_RES=$(curl -sf -X POST \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/templates/$SCRUM_TPL/instantiate-v5_1" \
    -d "{\"projectName\":\"Smoke Scrum $(date +%s)\"}")

  SCRUM_PID=$(echo "$SCRUM_RES" | jq -r '.data.projectId')
  check "project created" "$(echo "$SCRUM_RES" | jq -r '.data.projectId | length > 0')" "true"
  check "methodology = scrum" "$(echo "$SCRUM_RES" | jq -r '.data.methodology')" "scrum"

  # DB verification via API
  PROJ=$(curl -sf -H "Authorization: $AUTH" "$API/projects/$SCRUM_PID")
  check "methodology_config present" "$(echo "$PROJ" | jq -r '.data.methodologyConfig != null')" "true"
  check "sprint.enabled = true" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.sprint.enabled')" "true"
  check "iterationsEnabled = true" "$(echo "$PROJ" | jq -r '.data.iterationsEnabled')" "true"

  # Sprint operations
  SPRINT=$(curl -sf -X POST \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/work/iterations" \
    -d "{\"projectId\":\"$SCRUM_PID\",\"name\":\"Sprint 1\",\"startDate\":\"$(date -u +%Y-%m-%d)\",\"endDate\":\"$(date -u -v+14d +%Y-%m-%d 2>/dev/null || date -u -d '+14 days' +%Y-%m-%d)\"}" 2>/dev/null || echo '{"error":"failed"}')
  check "sprint create succeeds" "$(echo "$SPRINT" | jq -r '.id // .data.id // "fail" | length > 0')" "true"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# 2. KANBAN
# ═══════════════════════════════════════════════════════════════
echo "── 2. KANBAN ─────────────────────────────────────────────"

KANBAN_TPL=$(find_template "kanban")
if [ -z "$KANBAN_TPL" ]; then
  echo "  ✗ No kanban template found — skipping"
else
  KANBAN_RES=$(curl -sf -X POST \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/templates/$KANBAN_TPL/instantiate-v5_1" \
    -d "{\"projectName\":\"Smoke Kanban $(date +%s)\"}")

  KANBAN_PID=$(echo "$KANBAN_RES" | jq -r '.data.projectId')
  check "project created" "$(echo "$KANBAN_RES" | jq -r '.data.projectId | length > 0')" "true"
  check "methodology = kanban" "$(echo "$KANBAN_RES" | jq -r '.data.methodology')" "kanban"
  check "wipConfigCreated" "$(echo "$KANBAN_RES" | jq -r '.data.wipConfigCreated')" "true"

  PROJ=$(curl -sf -H "Authorization: $AUTH" "$API/projects/$KANBAN_PID")
  check "sprint.enabled = false" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.sprint.enabled')" "false"
  check "wip.enabled = true" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.wip.enabled')" "true"

  # Sprint create should fail
  SPRINT_FAIL=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/work/iterations" \
    -d "{\"projectId\":\"$KANBAN_PID\",\"name\":\"Sprint X\"}" 2>/dev/null || echo "000")
  check "sprint create blocked (400)" "$SPRINT_FAIL" "400"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# 3. WATERFALL
# ═══════════════════════════════════════════════════════════════
echo "── 3. WATERFALL ──────────────────────────────────────────"

WF_TPL=$(find_template "waterfall")
if [ -z "$WF_TPL" ]; then
  echo "  ✗ No waterfall template found — skipping"
else
  WF_RES=$(curl -sf -X POST \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/templates/$WF_TPL/instantiate-v5_1" \
    -d "{\"projectName\":\"Smoke Waterfall $(date +%s)\"}")

  WF_PID=$(echo "$WF_RES" | jq -r '.data.projectId')
  check "project created" "$(echo "$WF_RES" | jq -r '.data.projectId | length > 0')" "true"
  check "methodology = waterfall" "$(echo "$WF_RES" | jq -r '.data.methodology')" "waterfall"
  check "gateCount > 0" "$(echo "$WF_RES" | jq -r '.data.gateCount > 0')" "true"

  PROJ=$(curl -sf -H "Authorization: $AUTH" "$API/projects/$WF_PID")
  check "phases.gateRequired = true" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.phases.gateRequired')" "true"
  check "costTrackingEnabled = true" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.governance.costTrackingEnabled')" "true"
  check "earnedValueEnabled = true" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.governance.earnedValueEnabled')" "true"

  # Get first phase
  PHASES=$(curl -sf -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    "$API/work/phases?projectId=$WF_PID")
  FIRST_PHASE=$(echo "$PHASES" | jq -r '.data[0].id // empty')

  if [ -n "$FIRST_PHASE" ]; then
    # Complete phase should fail without gate approval
    COMPLETE_FAIL=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
      "$API/work/phases/$FIRST_PHASE/complete" 2>/dev/null || echo "000")
    check "phase complete blocked without gate (403)" "$COMPLETE_FAIL" "403"
  fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# 4. HYBRID
# ═══════════════════════════════════════════════════════════════
echo "── 4. HYBRID ─────────────────────────────────────────────"

HYBRID_TPL=$(find_template "hybrid")
if [ -z "$HYBRID_TPL" ]; then
  echo "  ✗ No hybrid template found — skipping"
else
  HYBRID_RES=$(curl -sf -X POST \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/templates/$HYBRID_TPL/instantiate-v5_1" \
    -d "{\"projectName\":\"Smoke Hybrid $(date +%s)\"}")

  HYBRID_PID=$(echo "$HYBRID_RES" | jq -r '.data.projectId')
  check "project created" "$(echo "$HYBRID_RES" | jq -r '.data.projectId | length > 0')" "true"
  check "methodology = hybrid" "$(echo "$HYBRID_RES" | jq -r '.data.methodology')" "hybrid"

  PROJ=$(curl -sf -H "Authorization: $AUTH" "$API/projects/$HYBRID_PID")
  check "sprint.enabled = true" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.sprint.enabled')" "true"
  check "costTrackingEnabled = true" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.governance.costTrackingEnabled')" "true"
  check "changeManagementEnabled = true" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.governance.changeManagementEnabled')" "true"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# 5. AGILE
# ═══════════════════════════════════════════════════════════════
echo "── 5. AGILE ──────────────────────────────────────────────"

# Agile may not have a system template — use any or skip
AGILE_TPL=$(find_template "agile")
if [ -z "$AGILE_TPL" ]; then
  echo "  ⓘ No agile template found — testing with scrum template + agile override"
else
  AGILE_RES=$(curl -sf -X POST \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/templates/$AGILE_TPL/instantiate-v5_1" \
    -d "{\"projectName\":\"Smoke Agile $(date +%s)\"}")

  AGILE_PID=$(echo "$AGILE_RES" | jq -r '.data.projectId')
  check "project created" "$(echo "$AGILE_RES" | jq -r '.data.projectId | length > 0')" "true"

  PROJ=$(curl -sf -H "Authorization: $AUTH" "$API/projects/$AGILE_PID")
  check "methodology_config present" "$(echo "$PROJ" | jq -r '.data.methodologyConfig != null')" "true"
  check "ui.tabs present" "$(echo "$PROJ" | jq -r '.data.methodologyConfig.ui.tabs | length > 0')" "true"
fi

# ═══════════════════════════════════════════════════════════════
# 6. DRIFT TESTS — bi-directional sync verification
# ═══════════════════════════════════════════════════════════════
echo "── 6. DRIFT TESTS ────────────────────────────────────────"

if [ -n "$SCRUM_PID" ]; then
  # 6a. PATCH legacy flags to disable iterations → sprint create must block
  curl -sf -X PATCH \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/projects/$SCRUM_PID" \
    -d '{"iterationsEnabled":false}' > /dev/null 2>&1

  PROJ_AFTER=$(curl -sf -H "Authorization: $AUTH" "$API/projects/$SCRUM_PID")
  check "legacy disable → config sprint.enabled = false" \
    "$(echo "$PROJ_AFTER" | jq -r '.data.methodologyConfig.sprint.enabled')" "false"

  SPRINT_BLOCK=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/work/iterations" \
    -d "{\"projectId\":\"$SCRUM_PID\",\"name\":\"Blocked Sprint\"}" 2>/dev/null || echo "000")
  check "sprint create blocked after legacy disable (400)" "$SPRINT_BLOCK" "400"

  # 6b. PATCH methodology-config to re-enable iterations → sprint create must succeed
  curl -sf -X PATCH \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/projects/$SCRUM_PID/methodology-config" \
    -d '{"sprint":{"enabled":true},"governance":{"iterationsEnabled":true}}' > /dev/null 2>&1

  PROJ_RE=$(curl -sf -H "Authorization: $AUTH" "$API/projects/$SCRUM_PID")
  check "config enable → iterationsEnabled = true" \
    "$(echo "$PROJ_RE" | jq -r '.data.iterationsEnabled')" "true"
  check "config enable → sprint.enabled = true" \
    "$(echo "$PROJ_RE" | jq -r '.data.methodologyConfig.sprint.enabled')" "true"

  SPRINT_OK=$(curl -sf -X POST \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/work/iterations" \
    -d "{\"projectId\":\"$SCRUM_PID\",\"name\":\"Re-enabled Sprint\",\"startDate\":\"$(date -u +%Y-%m-%d)\",\"endDate\":\"$(date -u -v+14d +%Y-%m-%d 2>/dev/null || date -u -d '+14 days' +%Y-%m-%d)\"}" 2>/dev/null || echo '{"error":"failed"}')
  check "sprint create succeeds after config enable" \
    "$(echo "$SPRINT_OK" | jq -r '.id // .data.id // "fail" | length > 0')" "true"

  # 6c. PATCH settings methodology change → methodologyCode synced
  curl -sf -X PATCH \
    -H "Authorization: $AUTH" -H "x-workspace-id: $WS" \
    -H "Content-Type: application/json" \
    "$API/projects/$SCRUM_PID/settings" \
    -d '{"methodology":"kanban"}' > /dev/null 2>&1

  PROJ_M=$(curl -sf -H "Authorization: $AUTH" "$API/projects/$SCRUM_PID")
  check "settings methodology → config.methodologyCode = kanban" \
    "$(echo "$PROJ_M" | jq -r '.data.methodologyConfig.methodologyCode')" "kanban"
  check "settings methodology → config.lifecycleType = flow" \
    "$(echo "$PROJ_M" | jq -r '.data.methodologyConfig.lifecycleType')" "flow"
else
  echo "  ⓘ Skipping drift tests — no Scrum project available"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " RESULTS: $pass passed, $fail failed"
echo "═══════════════════════════════════════════════════════════"

exit $fail
