#!/usr/bin/env bash
###############################################################################
# Wave 4A Staging Smoke Test — KPI Foundation Layer
# Tests: Definitions, Config, Enable/Disable, Compute, Values
###############################################################################
set -euo pipefail

STAGING_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
EMAIL="${SMOKE_EMAIL:-demo@zephix.ai}"
PASSWORD="${SMOKE_PASSWORD:-demo123456}"
COOKIE_JAR="$(mktemp)"
PROOF_DIR="$(cd "$(dirname "$0")" && cd ../../docs/architecture/proofs/phase5a/wave4a/rcXX && pwd)"

trap 'rm -f "$COOKIE_JAR"' EXIT

PASS=0; FAIL=0; TOTAL=0

log()    { printf '\033[1;34m[SMOKE]\033[0m %s\n' "$*" >&2; }
pass()   { TOTAL=$((TOTAL+1)); PASS=$((PASS+1)); printf '\033[1;32m  PASS %s\033[0m\n' "$1"; }
fail()   { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1)); printf '\033[1;31m  FAIL %s: %s\033[0m\n' "$1" "${2:-}"; }

unwrap() { python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('data',d)) if isinstance(d,dict) else str(d))"; }
field()  { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }
count()  { python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)"; }

###############################################################################
log "Wave 4A KPI Smoke — $STAGING_URL"
log "Proof dir: $PROOF_DIR"
mkdir -p "$PROOF_DIR"

# 1. Health
log "Health check"
HEALTH=$(curl -sf --max-time 10 "$STAGING_URL/health/ready")
echo "$HEALTH" > "$PROOF_DIR/staging-health.txt"
H_STATUS=$(echo "$HEALTH" | field status)
[ "$H_STATUS" = "ok" ] && pass "Health: $H_STATUS" || fail "Health" "$H_STATUS"

# 2. Identity
log "Identity check"
IDENT_RAW=$(curl -sf --max-time 10 "$STAGING_URL/system/identity")
IDENT=$(echo "$IDENT_RAW" | unwrap)
echo "$IDENT" > "$PROOF_DIR/staging-identity.txt"
I_ENV=$(echo "$IDENT" | field zephixEnv)
[ "$I_ENV" = "staging" ] && pass "Identity: env=$I_ENV" || fail "Identity" "env=$I_ENV"

# 3. CSRF
log "CSRF token"
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$STAGING_URL/auth/csrf" > /dev/null 2>&1
CSRF=$(grep XSRF-TOKEN "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}')
[ -n "$CSRF" ] && pass "CSRF acquired" || fail "CSRF" "empty token"

# 4. Login
log "Login"
LOGIN_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "$STAGING_URL/auth/login" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN_RAW" | python3 -m json.tool > "$PROOF_DIR/login.json" 2>/dev/null || true
USER_ID=$(echo "$LOGIN_RAW" | unwrap | field userId)
[ -n "$USER_ID" ] && pass "Login: userId=$USER_ID" || fail "Login" "no userId"

# 5. Get workspace
log "Get workspace"
WS_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF" \
  "$STAGING_URL/workspaces")
WS_ID=$(echo "$WS_RAW" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('data',d) if isinstance(d,dict) else d
if isinstance(items,list) and len(items)>0:
    print(items[0].get('id',''))
else:
    print('')
" 2>/dev/null || echo "")
[ -n "$WS_ID" ] && pass "Workspace: $WS_ID" || fail "Workspace" "no ws found"

# 6. Create project with governance flags
log "Create project with KPI governance flags"
PROJ_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "$STAGING_URL/projects" \
  -d "{
    \"name\":\"KPI Smoke $(date +%s)\",
    \"workspaceId\":\"$WS_ID\",
    \"iterationsEnabled\":true,
    \"costTrackingEnabled\":true,
    \"baselinesEnabled\":false,
    \"changeManagementEnabled\":true
  }")
echo "$PROJ_RAW" | python3 -m json.tool > "$PROOF_DIR/project-create.json" 2>/dev/null || true
PROJ_ID=$(echo "$PROJ_RAW" | unwrap | field id)
[ -n "$PROJ_ID" ] && pass "Project created: $PROJ_ID" || fail "Project" "no projectId"

# 7. GET /definitions
log "GET KPI definitions"
DEFS_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF" \
  "$STAGING_URL/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/definitions")
echo "$DEFS_RAW" | python3 -m json.tool > "$PROOF_DIR/kpi-definitions.json" 2>/dev/null || true
DEF_COUNT=$(echo "$DEFS_RAW" | unwrap | count)
[ "$DEF_COUNT" -ge 12 ] 2>/dev/null && pass "Definitions: $DEF_COUNT found" || fail "Definitions" "count=$DEF_COUNT"

# 8. GET /config
log "GET KPI config"
CFG_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF" \
  "$STAGING_URL/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/config")
echo "$CFG_RAW" | python3 -m json.tool > "$PROOF_DIR/kpi-config-initial.json" 2>/dev/null || true
CFG_COUNT=$(echo "$CFG_RAW" | unwrap | count)
[ "$CFG_COUNT" -ge 1 ] 2>/dev/null && pass "Config auto-created: $CFG_COUNT items" || fail "Config" "count=$CFG_COUNT"

# 9. PATCH /config — enable 6 KPIs
log "Enable 6 KPIs"
ENABLE_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X PATCH "$STAGING_URL/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/config" \
  -d "{\"items\":[
    {\"kpiCode\":\"velocity\",\"enabled\":true},
    {\"kpiCode\":\"throughput\",\"enabled\":true},
    {\"kpiCode\":\"wip\",\"enabled\":true},
    {\"kpiCode\":\"cycle_time\",\"enabled\":true},
    {\"kpiCode\":\"budget_burn\",\"enabled\":true},
    {\"kpiCode\":\"change_request_approval_rate\",\"enabled\":true}
  ]}")
echo "$ENABLE_RAW" | python3 -m json.tool > "$PROOF_DIR/kpi-config-patch.json" 2>/dev/null || true
ENABLE_COUNT=$(echo "$ENABLE_RAW" | unwrap | count)
[ "$ENABLE_COUNT" -eq 6 ] 2>/dev/null && pass "Enabled 6 KPIs" || fail "Enable KPIs" "count=$ENABLE_COUNT"

# 10. POST /compute
log "Trigger KPI computation"
COMPUTE_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "$STAGING_URL/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute")
echo "$COMPUTE_RAW" | python3 -m json.tool > "$PROOF_DIR/kpi-compute.json" 2>/dev/null || true
COMP_COUNT=$(echo "$COMPUTE_RAW" | unwrap | count)
[ "$COMP_COUNT" -ge 1 ] 2>/dev/null && pass "Computed: $COMP_COUNT values" || fail "Compute" "count=$COMP_COUNT"

# 11. GET /values
log "GET KPI values for today"
TODAY=$(date +%Y-%m-%d)
VALUES_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "x-csrf-token: $CSRF" \
  "$STAGING_URL/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/values?from=$TODAY&to=$TODAY")
echo "$VALUES_RAW" | python3 -m json.tool > "$PROOF_DIR/kpi-values.json" 2>/dev/null || true
VAL_COUNT=$(echo "$VALUES_RAW" | unwrap | count)
[ "$VAL_COUNT" -ge 1 ] 2>/dev/null && pass "Values: $VAL_COUNT rows for today" || fail "Values" "count=$VAL_COUNT"

# 12. Assert each enabled KPI has a row with sampleSize
log "Assert sampleSize present on all values"
HAS_SAMPLE=$(echo "$VALUES_RAW" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('data',d) if isinstance(d,dict) else d
if not isinstance(items,list): print('false'); sys.exit()
for v in items:
    if 'sampleSize' not in v and 'sample_size' not in v:
        print('false'); sys.exit()
print('true')
" 2>/dev/null || echo "false")
[ "$HAS_SAMPLE" = "true" ] && pass "All values have sampleSize" || fail "sampleSize" "missing"

###############################################################################
log ""
log "========================================="
log "Wave 4A KPI Smoke: $PASS/$TOTAL PASS"
log "========================================="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
