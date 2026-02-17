#!/usr/bin/env bash
###############################################################################
# Wave 4B Staging Smoke Test — Template ↔ KPI Binding
# Tests: Template KPI assignment, project instantiation auto-activation,
#        no kpi_definitions duplication
###############################################################################
set -euo pipefail

STAGING_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
EMAIL="${SMOKE_EMAIL:-demo@zephix.ai}"
PASSWORD="${SMOKE_PASSWORD:-demo123456}"
COOKIE_JAR="$(mktemp)"
PROOF_DIR="$(cd "$(dirname "$0")" && cd ../../docs/architecture/proofs/phase5a/wave4b/rcXX && pwd)"

trap 'rm -f "$COOKIE_JAR"' EXIT

PASS=0; FAIL=0; TOTAL=0

log()    { printf '\033[1;34m[SMOKE]\033[0m %s\n' "$*" >&2; }
pass()   { TOTAL=$((TOTAL+1)); PASS=$((PASS+1)); printf '\033[1;32m  PASS %s\033[0m\n' "$1"; }
fail()   { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1)); printf '\033[1;31m  FAIL %s: %s\033[0m\n' "$1" "${2:-}"; }

unwrap() { python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('data',d)) if isinstance(d,dict) else str(d))"; }
field()  { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }
count()  { python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)"; }

###############################################################################
log "Wave 4B Template-KPI Smoke — $STAGING_URL"
log "Proof dir: $PROOF_DIR"
mkdir -p "$PROOF_DIR"

# 1. Health
log "Health check"
HEALTH=$(curl -sf --max-time 10 "$STAGING_URL/health/ready")
echo "$HEALTH" > "$PROOF_DIR/staging-health.txt"
H_STATUS=$(echo "$HEALTH" | field status)
[ "$H_STATUS" = "ok" ] && pass "Health: $H_STATUS" || fail "Health" "$H_STATUS"

# 2. CSRF
log "CSRF token"
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$STAGING_URL/auth/csrf" > /dev/null 2>&1
CSRF=$(grep XSRF-TOKEN "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}')
[ -n "$CSRF" ] && pass "CSRF acquired" || fail "CSRF" "empty token"

# 3. Login
log "Login"
LOGIN_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "$STAGING_URL/auth/login" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN_RAW" | python3 -m json.tool > "$PROOF_DIR/login.json" 2>/dev/null || true
ORG_ID=$(echo "$LOGIN_RAW" | unwrap | field organizationId)
[ -n "$ORG_ID" ] && pass "Login: org=$ORG_ID" || fail "Login" "missing organizationId"

# 4. Get first workspace
log "List workspaces"
WS_RAW=$(curl -s -b "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF" \
  "$STAGING_URL/workspaces")
WS_ID=$(echo "$WS_RAW" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data = d.get('data', d) if isinstance(d, dict) else d
items = data if isinstance(data, list) else data.get('items', []) if isinstance(data, dict) else []
print(items[0]['id'] if items else '')
" 2>/dev/null || echo "")
[ -n "$WS_ID" ] && pass "Workspace: $WS_ID" || fail "Workspace" "none found"

# 5. GET KPI definitions to capture IDs
log "Fetch KPI definitions"
DEFS_RAW=$(curl -s -b "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF" \
  "$STAGING_URL/work/workspaces/$WS_ID/projects/00000000-0000-0000-0000-000000000000/kpis/definitions" 2>/dev/null || echo "{}")
echo "$DEFS_RAW" | python3 -m json.tool > "$PROOF_DIR/definitions.json" 2>/dev/null || true

DEF_COUNT=$(echo "$DEFS_RAW" | unwrap | count)
[ "$DEF_COUNT" -ge 12 ] && pass "KPI definitions: $DEF_COUNT found" || fail "KPI definitions" "only $DEF_COUNT"

# Extract first 2 definition IDs for template assignment
KPI_ID_1=$(echo "$DEFS_RAW" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data=d.get('data',d) if isinstance(d,dict) else d
items=data if isinstance(data,list) else []
print(items[0]['id'] if items else '')
" 2>/dev/null || echo "")

KPI_ID_2=$(echo "$DEFS_RAW" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data=d.get('data',d) if isinstance(d,dict) else d
items=data if isinstance(data,list) else []
print(items[1]['id'] if len(items)>1 else '')
" 2>/dev/null || echo "")

[ -n "$KPI_ID_1" ] && pass "KPI ID 1: $KPI_ID_1" || fail "KPI ID 1" "not found"
[ -n "$KPI_ID_2" ] && pass "KPI ID 2: $KPI_ID_2" || fail "KPI ID 2" "not found"

# 6. Create a template
log "Create template for KPI binding test"
TPL_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "$STAGING_URL/admin/templates" \
  -d "{\"name\":\"W4B-KPI-Test-$(date +%s)\",\"category\":\"test\",\"kind\":\"project\"}")
echo "$TPL_RAW" | python3 -m json.tool > "$PROOF_DIR/template-create.json" 2>/dev/null || true

TPL_ID=$(echo "$TPL_RAW" | unwrap | field id)
[ -n "$TPL_ID" ] && pass "Template created: $TPL_ID" || fail "Template create" "missing id"

# 7. Assign 2 KPIs to template
log "Assign KPI 1 to template"
ASSIGN1_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "$STAGING_URL/admin/templates/$TPL_ID/kpis" \
  -d "{\"kpiDefinitionId\":\"$KPI_ID_1\",\"isRequired\":true,\"defaultTarget\":\"95.0\"}")
echo "$ASSIGN1_RAW" | python3 -m json.tool > "$PROOF_DIR/assign-kpi-1.json" 2>/dev/null || true

A1_ID=$(echo "$ASSIGN1_RAW" | unwrap | field id)
[ -n "$A1_ID" ] && pass "Assign KPI 1: $A1_ID" || fail "Assign KPI 1" "failed"

log "Assign KPI 2 to template"
ASSIGN2_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "$STAGING_URL/admin/templates/$TPL_ID/kpis" \
  -d "{\"kpiDefinitionId\":\"$KPI_ID_2\",\"isRequired\":false}")
echo "$ASSIGN2_RAW" | python3 -m json.tool > "$PROOF_DIR/assign-kpi-2.json" 2>/dev/null || true

A2_ID=$(echo "$ASSIGN2_RAW" | unwrap | field id)
[ -n "$A2_ID" ] && pass "Assign KPI 2: $A2_ID" || fail "Assign KPI 2" "failed"

# 8. List template KPIs — should have exactly 2
log "List template KPIs"
LIST_RAW=$(curl -s -b "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF" \
  "$STAGING_URL/admin/templates/$TPL_ID/kpis")
echo "$LIST_RAW" | python3 -m json.tool > "$PROOF_DIR/template-kpis-list.json" 2>/dev/null || true

TK_COUNT=$(echo "$LIST_RAW" | unwrap | count)
[ "$TK_COUNT" -eq 2 ] && pass "Template KPIs listed: $TK_COUNT" || fail "Template KPI list" "expected 2, got $TK_COUNT"

# 9. Instantiate project from template
log "Instantiate project from template"
INST_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "$STAGING_URL/admin/templates/$TPL_ID/apply" \
  -d "{\"name\":\"W4B-AutoKPI-$(date +%s)\",\"workspaceId\":\"$WS_ID\"}")
echo "$INST_RAW" | python3 -m json.tool > "$PROOF_DIR/instantiate-project.json" 2>/dev/null || true

NEW_PROJ_ID=$(echo "$INST_RAW" | unwrap | field id)
[ -n "$NEW_PROJ_ID" ] && pass "Project instantiated: $NEW_PROJ_ID" || fail "Project instantiate" "missing id"

# 10. Verify project_kpi_configs contain the 2 template KPIs
log "Verify project KPI configs"
CFG_RAW=$(curl -s -b "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF" \
  "$STAGING_URL/work/workspaces/$WS_ID/projects/$NEW_PROJ_ID/kpis/config")
echo "$CFG_RAW" | python3 -m json.tool > "$PROOF_DIR/project-kpi-configs.json" 2>/dev/null || true

CFG_COUNT=$(echo "$CFG_RAW" | unwrap | count)
# Should have at least 2 (from template) + any default_enabled KPIs
[ "$CFG_COUNT" -ge 2 ] && pass "Project KPI configs: $CFG_COUNT (>= 2 from template)" || fail "Project KPI configs" "expected >= 2, got $CFG_COUNT"

# Check that the template KPIs are enabled
ENABLED=$(echo "$CFG_RAW" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data=d.get('data',d) if isinstance(d,dict) else d
items=data if isinstance(data,list) else []
enabled=[x for x in items if x.get('enabled')]
print(len(enabled))
" 2>/dev/null || echo "0")
[ "$ENABLED" -ge 2 ] && pass "Enabled KPI configs: $ENABLED" || fail "Enabled configs" "expected >= 2, got $ENABLED"

# 11. Verify no kpi_definitions duplication — count should still be same as before
log "Verify no KPI definition duplication"
DEFS_AFTER=$(curl -s -b "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF" \
  "$STAGING_URL/work/workspaces/$WS_ID/projects/$NEW_PROJ_ID/kpis/definitions" 2>/dev/null || echo "{}")
echo "$DEFS_AFTER" | python3 -m json.tool > "$PROOF_DIR/definitions-after.json" 2>/dev/null || true

DEF_AFTER_COUNT=$(echo "$DEFS_AFTER" | unwrap | count)
[ "$DEF_AFTER_COUNT" -eq "$DEF_COUNT" ] && pass "No definition duplication: $DEF_AFTER_COUNT == $DEF_COUNT" || fail "Definition duplication" "$DEF_AFTER_COUNT != $DEF_COUNT"

###############################################################################
log "======================================"
log "Wave 4B Template-KPI Smoke Summary"
log "PASSED: $PASS / $TOTAL"
if [ "$FAIL" -gt 0 ]; then
  log "FAILED: $FAIL / $TOTAL"
  exit 1
fi
log "ALL PASSED"
